const express = require('express');

const purchPostInvoiceService = require('../services/purchPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createPurchPostInvoiceSchema, getPurchPostInvoiceSchema, updatePurchPostInvoiceSchema, queryPurchPostInvoicetSchema} = require('../schemas/purchPostInvoice.schema');

const router = express.Router();
const service = new purchPostInvoiceService();

router.get('/data/:budgetCode', async (req, res, next) => {
    const { budgetCode } = req.params;
    try {
        const totalFacturado = await service.getTotalByBudget(budgetCode);

        const data = {
            totalFacturado: totalFacturado
        };

        res.json(data);
    } catch (error) {
        next(boom.badImplementation('Error al obtener los datos para el gráfico', error));
    }
});

router.get('/purchPostInvoice-paginated', async(req, res, next) => {
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
      const totalPostPurch = await service.countAll(); // Llama al nuevo método del servicio
      res.status(200).json({ totalPostPurch });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getPurchPostInvoiceSchema, 'params'),

  async (req, res, next) => {
    console.time(`Tiempo de consulta para la factura compra registrada ID ${req.params.code}`);
     try {
      const { code } = req.params;
      // --- CAMBIOS CLAVE AQUÍ ---
      // Leer los parámetros de consulta 'include_vendor' y 'include_lines'
      const includeVendor = req.query.include_vendor === 'true' || req.query.include_vendor === '1';
      const includeLines = req.query.include_lines === 'true' || req.query.include_lines === '1';

      // Llamar al servicio, pasando el objeto de opciones
      const purchPostInvoice = await service.findOne(code, {
        includeVendor, // Aquí es 'includeVendor: includeVendor' abreviado
        includeLines     // Aquí es 'includeLines: includeLines' abreviado
      });

      console.timeEnd(`Tiempo de consulta para la factura compra registrada ID ${code}`);
      res.json(purchPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(queryPurchPostInvoicetSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a fatura compra registrada");
    try {
      const purchPostInvoice = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a fatura compra registrada");
      res.json(purchPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createPurchPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newPurchPostInvoiceget = await service.create(body);
      res.status(201).json(newPurchPostInvoiceget);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de la factura compra regsitrada'${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);

router.patch('/:code',
  validatorHandler(getPurchPostInvoiceSchema, 'params'),
  validatorHandler(updatePurchPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
      const { code } = req.params;
      const body = req.body;
      const PurchPostInvoice = await service.update(code, body);
      res.json(PurchPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  validatorHandler(getPurchPostInvoiceSchema, 'params'),
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
