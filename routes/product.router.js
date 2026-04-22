const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const ProductsService = require('../services/products.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createProductSchema,
    updateProductSchema,
    getProductSchema,
    queryProductSchema
} = require('../schemas/product.schema');

const router = express.Router();
const service = new ProductsService();

// --- RUTAS DE LECTURA ---

router.get('/products-paginated',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'),
    async (req, res, next) => {
        try {
            const { limit, offset, searchTerm } = req.query;
            const result = await service.findPaginated({ limit, offset, searchTerm });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/search',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'),
    async (req, res, next) => {
        try {
            const { term } = req.query;
            const products = await service.search(term);
            res.json(products);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/:code',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'),
    validatorHandler(getProductSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const product = await service.findOne(code);
            res.json(product);
        } catch (error) {
            next(error);
        }
    }
);

// --- RUTAS DE ESCRITURA ---

router.post('/',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'), // NOTA: Asegúrate de usar permisos que existan en tu token
    validatorHandler(createProductSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            // req.user ya existe aquí gracias a passport
            const userId = req.user.userId || req.user.sub;
            const newProduct = await service.create(body, userId);
            res.status(201).json(newProduct);
        } catch (error) {
            next(error);
        }
    }
);

router.patch('/:code',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'),
    validatorHandler(getProductSchema, 'params'),
    validatorHandler(updateProductSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const body = req.body;
            const userId = req.user.userId || req.user.sub;
            const product = await service.update(code, body, userId);
            res.json(product);
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:code',
    passport.authenticate('jwt', { session: false }), // 2. Autenticar primero
    checkPermission('allowGestion'), // Normalmente borrar productos es nivel configuración/admin
    validatorHandler(getProductSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            await service.delete(code);
            res.status(200).json({ code });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
