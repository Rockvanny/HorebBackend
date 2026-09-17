const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const DocumentTaxService = require('../services/documentTax.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../config/access-manager');
const { filterDocumentTaxSchema } = require('../schemas/documentTax.schema');

const router = express.Router();
const service = new DocumentTaxService();

// Este endpoint es transversal: 'codeDocument' puede ser un presupuesto, una
// factura de venta o una de compra (ver schemas/documentTax.schema.js), cada
// uno en un módulo distinto -por eso no vale un único checkAction('VIEW_X')
// fijo (dejaría fuera la mitad de los casos legítimos, o los dejaría todos
// abiertos). Se resuelve el permiso real según el tipo de documento pedido.
const CODE_DOCUMENT_ACTIONS = {
    budget: 'VIEW_SALESBUDGETS',
    salesinvoice: 'VIEW_SALESINVOICES',
    salespostinvoices: 'VIEW_SALESPOSTINVOICES',
    purchinvoice: 'VIEW_PURCHINVOICES',
    purchpostinvoices: 'VIEW_PURCHPOSTINVOICES',
};

function checkDocumentTaxAccess(req, res, next) {
    const action = CODE_DOCUMENT_ACTIONS[req.params.codeDocument];
    if (!action || !checkPermission(req.user, action)) {
        return next(boom.forbidden(`Acceso denegado a la acción: VIEW_DOCUMENTTAX (${req.params.codeDocument})`));
    }
    next();
}

/**
 * Obtener el desglose de impuestos de cualquier documento mediante su UUID
 * GET /api/v1/document-taxes/budget/550e8400-e29b-41d4-a716-446655440000
 */
router.get('/:codeDocument/:movementId',
    passport.authenticate('jwt', { session: false }),
    validatorHandler(filterDocumentTaxSchema, 'params'),
    checkDocumentTaxAccess,
    async (req, res, next) => {
        try {
            const { codeDocument, movementId } = req.params;
            // El servicio ahora busca por el "ADN" del documento (UUID)
            const record = await service.findByMovement(codeDocument, movementId);
            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

module.exports = router;
