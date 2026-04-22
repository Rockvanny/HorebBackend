const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');
const { config } = require('../config/config');

const ROLES = ['master', 'admin', 'financiero', 'vendedor', 'almacen', 'externo', 'viewer'];

class UserService {
  constructor() { }

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
        { userId: { [Op.iLike]: searchPattern } },
        { fullName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.User.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar usuarios paginados', error);
    }
  }

  async login(email, password) {
    let userData = null;
    let isMaster = false;

    // 1. CAPA MAESTRA: Solo acceso técnico
    if (email === config.masterUser && password === config.masterPassword) {
      isMaster = true;

      userData = {
        userId: config.masterUser,
        fullName: 'Soporte Horeb',
        role: 'master',
        isMaster: true,
        allowGestion: true,
        allowSales: true,
        allowPurchases: true,
        allowReports: true,
        allowSettings: true // <--- Único permiso activo
      };
    } else {
      // 2. CAPA BASE DE DATOS
      const user = await models.User.findOne({ where: { email } });
      if (!user) throw boom.unauthorized('Usuario o contraseña incorrectos');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw boom.unauthorized('Usuario o contraseña incorrectos');

      userData = user.toJSON();
    }

    // 3. Generación de Token (JWT)
    const payload = {
      sub: userData.userId,
      role: userData.role,
      // Inyectamos permisos directamente en el token para el middleware
      permissions: {
        allowGestion: userData.allowGestion,
        allowSales: userData.allowSales,
        allowPurchases: userData.allowPurchases,
        allowSettings: userData.allowSettings,
        allowReports: userData.allowReports
      }
    };

    const token = jwt.sign(payload, config.jwtSecret || 'secret_key', { expiresIn: '8h' });

    if (userData.password) delete userData.password;
    return { user: userData, token };
  }

  async findOne(id) {
    if (id === config.masterUser) {
      return {
        userId: config.masterUser,
        fullName: 'Soporte Horeb',
        role: 'master',
        allowGestion: false,
        allowSettings: true
      };
    }

    const user = await models.User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) throw boom.notFound('Usuario no encontrado');
    return user;
  }

  async update(id, changes, userExecutor) {
    if (id === config.masterUser) throw boom.forbidden('No se puede modificar el Maestro');
    const user = await this.findOne(id);
    const updatedUser = await user.update(changes, { userExecutor });
    const { password, ...userWithoutPassword } = updatedUser.toJSON();
    return userWithoutPassword;
  }

  async delete(id) {
    if (id === config.masterUser) throw boom.forbidden('No se puede eliminar al Maestro');
    const user = await this.findOne(id);
    await user.destroy();
    return { id };
  }
}

module.exports = UserService;
