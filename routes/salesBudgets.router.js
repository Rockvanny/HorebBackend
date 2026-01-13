const express = require('express');
const salesBudgetService = require('../services/salesBudgets.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createSalesBudgetSchema, getSalesBudgetSchema, updateSalesBudgetSchema, querySalesBudgetSchema} = require('../schemas/salesBudgets.schema');

const router = express.Router();
const service = new salesBudgetService();

router.get('/salesBudgets-paginated', async(req, res, next) => {
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
      const totalBudgets = await service.countAll(); // Llama al nuevo método del servicio
      res.status(200).json({ totalBudgets });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getSalesBudgetSchema, 'params'),

  async (req, res, next) => {
    console.time(`Tiempo de consulta para el presupuesto ID ${req.params.code}`);
     try {
      const { code } = req.params;

      // --- CAMBIOS CLAVE AQUÍ ---
      // Leer los parámetros de consulta 'include_vendor' y 'include_lines'
      const includeCustomer = req.query.include_customer === 'true' || req.query.include_customer === '1';
      const includeLines = req.query.include_lines === 'true' || req.query.include_lines === '1';

      // Llamar al servicio, pasando el objeto de opciones
      const salesBudget = await service.findOne(code, {
        includeCustomer,
        includeLines
      });

      console.timeEnd(`Tiempo de consulta para el presupuesto ID ${code}`);
      res.json(salesBudget);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(querySalesBudgetSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a presupuestos");
    try {
      const salesBudgets = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a presupuestos");
      res.json(salesBudgets);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createSalesBudgetSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newSalesBudget = await service.create(body);
      res.status(201).json(newSalesBudget);
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


router.put('/:code',
  validatorHandler(getSalesBudgetSchema, 'params'),
  validatorHandler(updateSalesBudgetSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PUT para actualizar presupuesto completo');
      const { code } = req.params;
      const body = req.body;

      const salesBudget = await service.update(code, body);
      res.json(salesBudget);
    } catch (error) {
      next(error);
    }
  }
);


router.delete('/:code',
  validatorHandler(getSalesBudgetSchema, 'params'),
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
