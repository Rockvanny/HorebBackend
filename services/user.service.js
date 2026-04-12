const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');
const { config } = require('../config/config'); // Importante para validar el Master

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

    /**
     * Login unificado: Procesa tanto al usuario Maestro (config) como a los de BD.
     */
    async login(email, password) {
        let userData = null;

        // 1. CAPA MAESTRA: Validamos contra variables de entorno
        if (email === config.masterUser && password === config.masterPassword) {
            userData = {
                userId: config.masterUser,
                fullName: 'Soporte Horeb',
                role: 'master',
                mustChangePassword: false,
                allowGestion: true,
                allowSales: true,
                allowPurchases: true,
                allowReports: true,
                allowSettings: true
            };
        } else {
            // 2. CAPA BASE DE DATOS: Búsqueda normal
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
            mustChangePassword: userData.mustChangePassword,
            permissions: {
                allowGestion: userData.allowGestion,
                allowSales: userData.allowSales,
                allowPurchases: userData.allowPurchases,
                allowSettings: userData.allowSettings
            }
        };

        const token = jwt.sign(payload, config.jwtSecret || 'secret_key', { expiresIn: '8h' });

        // Limpiamos el password antes de devolverlo
        if (userData.password) delete userData.password;

        return { user: userData, token };
    }

    /**
     * CREAR: Añadido userExecutor para auditoría.
     */
    async create(data, userExecutor) {
        const newUser = await models.User.create(data, { userExecutor });
        const { password, ...userWithoutPassword } = newUser.toJSON();
        return userWithoutPassword;
    }

    async findOne(id) {
        // Si el ID buscado es el master, devolvemos el perfil virtual
        if (id === config.masterUser) {
            return {
                userId: config.masterUser,
                fullName: 'Soporte Horeb',
                role: 'master',
                allowGestion: true,
                allowSettings: true
            };
        }

        const user = await models.User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) throw boom.notFound('Usuario no encontrado');
        return user;
    }

    /**
     * ACTUALIZAR: Añadido userExecutor para auditoría.
     */
    async update(id, changes, userExecutor) {
        if (id === config.masterUser) throw boom.forbidden('No se puede modificar el usuario Maestro desde la API');

        const user = await this.findOne(id);
        const updatedUser = await user.update(changes, { userExecutor });
        const { password, ...userWithoutPassword } = updatedUser.toJSON();
        return userWithoutPassword;
    }

    async delete(id) {
        if (id === config.masterUser) throw boom.forbidden('No se puede eliminar al usuario Maestro');

        const user = await this.findOne(id);
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
