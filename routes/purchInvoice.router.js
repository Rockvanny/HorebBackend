const express = require('express');
const puchInvoiceService = require('../services/purchInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createPurchInvoiceSchema, getPurchInvoiceSchema, updatePurchInvoiceSchema, queryPurchInvoiceSchema} = require('../schemas/purchInvoice.schema');

const router = express.Router();
const service = new puchInvoiceService();

router.get('/purchInvoices-paginated', async(req, res, next) => {
  try {
    const { limit, offset, searchTerm } = req.query;
    const result = await service.findPaginated({ limit, offset, searchTerm });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/count',
  async (req, res, next) => {
    try {
      const totalPurch = await service.countAll(); // Llama al nuevo método del servicio
      res.status(200).json({ totalPurch });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getPurchInvoiceSchema, 'params'),

  async (req, res, next) => {
    console.time(`Tiempo de consulta para la factura ID ${req.params.code}`);
     try {
      const { code } = req.params;

      const includevendor = req.query.include_vendor === 'true' || req.query.include_vendor === '1';
      const includeLines = req.query.include_lines === 'true' || req.query.include_lines === '1';

      const puchInvoice = await service.findOne(code, {
        includevendor,
        includeLines
      });

      console.timeEnd(`Tiempo de consulta para la factura ID ${code}`);
      res.json(puchInvoice);
    } catch (error) {
      next(error);
    }
  }
);


router.get('/',
  validatorHandler(queryPurchInvoiceSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a facturas");
    try {
      const puchInvoice = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a facturas");
      res.json(puchInvoice);
    } catch (error) {
      next(error);
    }
  }
);


router.post('/',
  validatorHandler(createPurchInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newPurchInvoice = await service.create(body);
      res.status(201).json(newPurchInvoice);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de factura '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);

router.post('/:code/archive',
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {

        try {
            const { code } = req.params; // Obtiene el código de la URL
            const result = await service.archiveInvoice(code); // Llama al método del servicio
            res.status(200).json(result);
        } catch (error) {
            next(error); // Pasa el error al middleware de manejo de errores
        }
    }
);

router.put('/:code',
  validatorHandler(getPurchInvoiceSchema, 'params'),
  validatorHandler(updatePurchInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PUT para actualizar factura completo');
      const { code } = req.params;
      const body = req.body;

      const puchInvoice = await service.update(code, body);
      res.json(puchInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  validatorHandler(getPurchInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code);
      res.status(201).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
