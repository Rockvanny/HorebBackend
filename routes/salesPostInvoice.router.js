const express = require('express');

const salesPostInvoiceService = require('../services/salesPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createSalesPostInvoiceSchema, getSalesPostInvoiceSchema, updateSalesPostInvoiceSchema, querySalesPostInvoiceSchema} = require('../schemas/salesPostInvoice.schema');

const router = express.Router();
const service = new salesPostInvoiceService();

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

router.get('/salesPostInvoices-paginated', async(req, res, next) => {
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
      const totalPostSalesInvoice = await service.countAll(); // Llama al nuevo método del servicio
      res.status(200).json({ totalPostSalesInvoice });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getSalesPostInvoiceSchema, 'params'),

  async (req, res, next) => {
    console.time(`Tiempo de consulta para el presupuesto ID ${req.params.code}`);
     try {
      const { code } = req.params;

      const includeCustomer = req.query.include_customer === 'true' || req.query.include_customer === '1';
      const includeLines = req.query.include_lines === 'true' || req.query.include_lines === '1';

      // Llamar al servicio, pasando el objeto de opciones
      const salesPostInvoice = await service.findOne(code, {
        includeCustomer,
        includeLines
      });

      console.timeEnd(`Tiempo de consulta para el presupuesto ID ${code}`);
      res.json(salesPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(querySalesPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a presupuestos");
    try {
      const salesPostInvoice = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a presupuestos");
      res.json(salesPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newSalesPostInvoice = await service.create(body);
      res.status(201).json(newSalesPostInvoice);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de presupuesto '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);

router.patch('/:code',
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
  validatorHandler(updateSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
      const { code } = req.params;
      const body = req.body;
      const salesPostInvoice = await service.update(code, body);
      res.json(salesPostInvoice);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
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
