const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');

const ROLES = ['master', 'admin', 'financiero', 'vendedor', 'almacen', 'externo', 'viewer'];

class UserService {
    constructor() {}

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
        const user = await models.User.findOne({ where: { email } });
        if (!user) throw boom.unauthorized('Usuario o contraseña incorrectos');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw boom.unauthorized('Usuario o contraseña incorrectos');

        const payload = {
            sub: user.userId,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            permissions: {
                allowGestion: user.allowGestion,
                allowSales: user.allowSales,
                allowPurchases: user.allowPurchases,
                allowSettings: user.allowSettings
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret_key', { expiresIn: '8h' });
        const { password: _, ...userWithoutPassword } = user.toJSON();

        return { user: userWithoutPassword, token };
    }

    async create(data) {
        const newUser = await models.User.create(data);
        const { password, ...userWithoutPassword } = newUser.toJSON();
        return userWithoutPassword;
    }

    async findOne(id) {
        const user = await models.User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) throw boom.notFound('Usuario no encontrado');
        return user;
    }

    async update(id, changes) {
        const user = await this.findOne(id);
        const updatedUser = await user.update(changes);
        const { password, ...userWithoutPassword } = updatedUser.toJSON();
        return userWithoutPassword;
    }

    async delete(id) {
        const user = await this.findOne(id);
        if (user.role === 'master') throw boom.forbidden('No se puede eliminar al usuario Master');
        await user.destroy();
        return { id };
    }

    async search(searchTerm) {
        const term = searchTerm?.trim() || '';
        if (!term) return [];
        return await models.User.findAll({
            where: {
                [Op.or]: [
                    { userId: { [Op.iLike]: `%${term}%` } },
                    { fullName: { [Op.iLike]: `%${term}%` } }
                ]
            },
            limit: 10,
            attributes: ['userId', 'fullName', 'role'],
            raw: true
        });
    }

    async getAvailableRoles() {
        return ROLES;
    }
}

module.exports = UserService;
