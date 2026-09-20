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
        { fullName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } }
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

  async create(data) {
    const newEmployee = await models.Employee.create(data);
    const { password, ...employeeWithoutPassword } = newEmployee.toJSON();
    return employeeWithoutPassword;
  }

  async update(code, changes) {
    const employee = await models.Employee.findByPk(code);
    if (!employee) throw boom.notFound('Empleado no encontrado');
    const updated = await employee.update(changes);
    const { password, ...employeeWithoutPassword } = updated.toJSON();
    return employeeWithoutPassword;
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

    if (!employee) throw boom.unauthorized('Usuario o contraseña incorrectos');

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
    if (!employee) throw boom.unauthorized('Usuario o contraseña incorrectos');

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

    if (!employee) {
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
    if (!employee) throw boom.unauthorized('Código inválido o expirado');

    await employee.update({ password: newPassword, mustChangePassword: false });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async resendPasswordReset(challengeId) {
    return otpService.resendChallenge(challengeId, PASSWORD_RESET_PURPOSE);
  }
}

module.exports = EmployeesService;
