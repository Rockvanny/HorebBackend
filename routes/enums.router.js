const express = require('express');
const UtilsService = require('../services/util.service');
const router = express.Router();
const service = new UtilsService();

// Ejemplo: /api/v1/enums/purchInvoice/paymentMethod
router.get('/:model/:field', async (req, res, next) => {
    try {
        const { model, field } = req.params;
        const values = await service.getEnumValues(model, field);
        res.json({
            success: true,
            data: values
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
