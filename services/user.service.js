const boom = require('@hapi/boom');
const { models } = require('./../libs/sequelize');

const ROLES = ['master', 'admin', 'financiero', 'vendedor', 'almacen', 'externo', 'viewer'];

class UserService {
  constructor() { }


  async login(email, password) {
    const user = await models.User.findOne({
      where: { email }
    });

    if (!user) {
      throw boom.unauthorized('Usuario o contraseña incorrectos');
    }

    if (user.password !== password) {
      throw boom.unauthorized('Usuario o contraseña incorrectos');
    }

    // Al hacer toJSON() se incluyen fullName, userId, y todos los allowX
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async create(data) {
    const newUser = await models.User.create(data);
    const { password, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  async find() {
    const rta = await models.User.findAll({
      include: ['customer'],
      attributes: { exclude: ['password'] }
    });
    return rta;
  }

  async findOne(id) {
    const user = await models.User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: ['customer']
    });

    if (!user) {
      throw boom.notFound('user not found');
    }
    return user;
  }

  async update(id, changes) {
    const user = await this.findOne(id);
    const rta = await user.update(changes);
    const { password, ...updatedUser } = rta.toJSON();
    return updatedUser;
  }

  async delete(id) {
    const user = await this.findOne(id);
    await user.destroy();
    return { id };
  }

  async getAvailableRoles() {
    return ROLES;
  }
}

module.exports = UserService;
