const boom = require('@hapi/boom');
const { models } = require('./../libs/sequelize');

const ROLES = ['master', 'admin', 'financiero', 'vendedor', 'almacen', 'externo', 'viewer'];

class UserService {
    constructor() {}

    
    async login(email, password) {
        // 1. Buscamos al usuario por email
        // IMPORTANTE: Aquí NO excluimos el password porque lo necesitamos para comparar
        const user = await models.User.findOne({
            where: { email }
        });

        // 2. Si no existe el usuario
        if (!user) {
            throw boom.unauthorized('Usuario o contraseña incorrectos');
        }

        // 3. Verificamos la contraseña
        // (Nota: Si luego usas bcrypt, aquí iría: await bcrypt.compare(password, user.password))
        if (user.password !== password) {
            throw boom.unauthorized('Usuario o contraseña incorrectos');
        }

        // 4. Si es correcto, extraemos el password para no enviarlo al frontend
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
