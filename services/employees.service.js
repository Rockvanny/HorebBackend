const crypto = require('crypto');
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');
const { getConfig } = require('../config/config');
const { maskEmail } = require('../libs/maskEmail');
const OtpService = require('./otp.service');

const config = getConfig();
const otpService = new OtpService();
// Propósitos propios, distintos de los de Users/Customers (mismo criterio
// que CUSTOMER_LOGIN_2FA vs LOGIN_2FA): un reto de un flujo nunca debe
// poder verificarse como si fuera de otro.
const LOGIN_OTP_PURPOSE = 'EMPLOYEE_LOGIN_2FA';
const PASSWORD_RESET_PURPOSE = 'EMPLOYEE_PASSWORD_RESET';

class EmployeesService {

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['full_name', 'ASC']],
      attributes: { exclude: ['password'] },
      where: {},
    };

    if (searchTerm) {
      const term = searchTerm.trim();
      const searchPattern = `%${term}%`;
      options.where[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { employeeNo: { [Op.iLike]: searchPattern } },
        { fullName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } },
        { documentNumber: { [Op.iLike]: searchPattern } }
      ];
    }

    const { count, rows } = await models.Employee.findAndCountAll(options);
    return {
      records: rows,
      hasMore: (parsedOffset + rows.length) < count,
      total: count,
    };
  }

  async findOne(code) {
    const employee = await models.Employee.findByPk(code, {
      attributes: { exclude: ['password'] }
    });
    if (!employee) throw boom.notFound('Empleado no encontrado');
    return employee;
  }

  /**
   * Búsqueda para las nóminas de gastos operativos (ver
   * operatingExpenses: entityType 'employee'). Solo lo imprescindible para
   * rellenar el gasto: nada de email, rol ni datos de la app.
   */
  async lookup(searchTerm) {
    const term = (searchTerm || '').trim();
    if (!term) return [];
    const pattern = `%${term}%`;
    const rows = await models.Employee.findAll({
      where: {
        employeeNo: { [Op.ne]: null },
        [Op.or]: [
          { employeeNo: { [Op.iLike]: pattern } },
          { fullName: { [Op.iLike]: pattern } },
          { documentNumber: { [Op.iLike]: pattern } }
        ]
      },
      attributes: ['employeeNo', 'fullName', 'documentType', 'documentNumber', 'terminationDate'],
      order: [['fullName', 'ASC']],
      limit: 10
    });
    return rows.map(r => r.toJSON());
  }

  /** Un empleado por su nº de empleado (botón Buscar de gastos operativos). */
  async findByEmployeeNo(employeeNo) {
    const employee = await models.Employee.findOne({
      where: { employeeNo },
      attributes: ['employeeNo', 'fullName', 'documentType', 'documentNumber', 'terminationDate']
    });
    if (!employee) throw boom.notFound('Empleado no encontrado');
    return employee.toJSON();
  }

  async create(data) {
    const newEmployee = await models.Employee.create(this.#normalize(data));
    const { password, ...employeeWithoutPassword } = newEmployee.toJSON();
    return employeeWithoutPassword;
  }

  async update(code, changes) {
    const employee = await models.Employee.findByPk(code);
    if (!employee) throw boom.notFound('Empleado no encontrado');

    const data = this.#normalize(changes, employee);
    // Dar acceso a la app a un empleado que no lo tenía: hacen falta email y
    // contraseña (la guardada, si ya tenía, o una nueva).
    const hasAccess = data.appAccess ?? employee.appAccess;
    if (hasAccess) {
      const email = 'email' in data ? data.email : employee.email;
      if (!email) throw boom.badRequest('Para dar acceso a la app móvil hace falta el correo electrónico.');
      if (!(data.password || employee.password)) throw boom.badRequest('Para dar acceso a la app móvil hace falta una contraseña.');
    }

    const updated = await employee.update(data);
    const { password, ...employeeWithoutPassword } = updated.toJSON();
    return employeeWithoutPassword;
  }

  /**
   * Vacíos a null (para poder borrar un dato opcional al editar), fecha de
   * baja >= alta y, sin acceso a la app, sin contraseña: un empleado solo
   * para nóminas no puede iniciar sesión (ver login y employeeJwt.strategy).
   */
  #normalize(data, current = null) {
    const result = { ...data };
    for (const [key, value] of Object.entries(result)) {
      if (value === '') result[key] = null;
    }
    const hire = result.hireDate !== undefined ? result.hireDate : current?.hireDate;
    const leave = result.terminationDate !== undefined ? result.terminationDate : current?.terminationDate;
    if (hire && leave && new Date(leave) < new Date(hire)) {
      throw boom.badRequest('La fecha de baja no puede ser anterior a la de alta.');
    }
    if (result.appAccess === false) result.password = null;
    return result;
  }

  async delete(code) {
    const employee = await models.Employee.findByPk(code);
    if (!employee) throw boom.notFound('Empleado no encontrado');
    await employee.destroy();
    return { code };
  }

  /**
   * PASO 1 del login: valida email + contraseña y crea un reto OTP -mismo
   * mecanismo de 2FA que Users/Customers-. El JWT solo se emite tras
   * verificar el código en verifyLoginOtp().
   */
  async login(email, password) {
    const employee = await models.Employee.findOne({ where: { email } });

    // Sin acceso a la app (empleado solo para nóminas): mismo mensaje que
    // un usuario inexistente, para no revelar qué emails hay registrados.
    if (!employee || !employee.appAccess || !employee.password) throw boom.unauthorized('Usuario o contraseña incorrectos');

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) throw boom.unauthorized('Usuario o contraseña incorrectos');

    return otpService.createChallenge(employee, LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 2: verifica el OTP y emite el JWT. `type: 'EMPLOYEE'` en el payload
   * es lo que distingue este token del de un User o un Customer (ver
   * libs/employeeJwt.strategy.js, la única estrategia que los acepta).
   */
  async verifyLoginOtp(challengeId, code) {
    const employeeCode = await otpService.verifyChallenge(challengeId, code, LOGIN_OTP_PURPOSE);

    const employee = await models.Employee.findByPk(employeeCode);
    if (!employee || !employee.appAccess) throw boom.unauthorized('Usuario o contraseña incorrectos');

    const token = jwt.sign({ sub: employee.code, role: employee.role, type: 'EMPLOYEE' }, config.jwtSecret, { expiresIn: '8h' });

    const employeeData = employee.toJSON();
    delete employeeData.password;
    return { employee: employeeData, token };
  }

  async resendLoginOtp(challengeId) {
    return otpService.resendChallenge(challengeId, LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 1 del reseteo de contraseña sin sesión previa. Si el email no
   * corresponde a ningún empleado, devuelve una respuesta con la misma
   * forma (challengeId falso) para no filtrar si un email está registrado.
   */
  async requestPasswordReset(email) {
    const employee = await models.Employee.findOne({ where: { email } });

    if (!employee || !employee.appAccess) {
      return {
        challengeId: crypto.randomUUID(),
        expiresInSeconds: config.otpExpirationMinutes * 60,
        maskedEmail: maskEmail(email)
      };
    }

    return otpService.createChallenge(employee, PASSWORD_RESET_PURPOSE);
  }

  async resetPassword(challengeId, code, newPassword) {
    const employeeCode = await otpService.verifyChallenge(challengeId, code, PASSWORD_RESET_PURPOSE);

    const employee = await models.Employee.findByPk(employeeCode);
    if (!employee || !employee.appAccess) throw boom.unauthorized('Código inválido o expirado');

    await employee.update({ password: newPassword, mustChangePassword: false });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async resendPasswordReset(challengeId) {
    return otpService.resendChallenge(challengeId, PASSWORD_RESET_PURPOSE);
  }
}

module.exports = EmployeesService;
