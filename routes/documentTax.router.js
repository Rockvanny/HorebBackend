const express = require('express');
const passport = require('passport');
const DocumentTaxService = require('../services/documentTax.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { filterDocumentTaxSchema } = require('../schemas/documentTax.schema');

const router = express.Router();
const service = new DocumentTaxService();

/**
 * Obtener el desglose de impuestos de cualquier documento mediante su UUID
 * GET /api/v1/document-taxes/budget/550e8400-e29b-41d4-a716-446655440000
 */
router.get('/:codeDocument/:movementId',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'), // O un permiso más genérico si lo prefieres
    validatorHandler(filterDocumentTaxSchema, 'params'),
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
