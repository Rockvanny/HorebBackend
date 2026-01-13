const express = require('express');

const salesBudgetLineService = require('../services/salesBudgetsLines.service');
const validatorHandler = require('../middlewares/validator.handler');

// Esquemas específicos para las líneas de presupuesto
const {
  createSalesBudgetLineSchema,
  getSalesBudgetLineSchema,    // <-- Este esquema ahora necesitará validar codeBudget y lineNo
  updateSalesBudgetLineSchema,
  querySalesBudgetLineSchema
} = require('../schemas/salesBudgetLines.schema');

const router = express.Router();
const service = new salesBudgetLineService();

// GET /paginated (Obtener todas las líneas con paginación y búsqueda)
router.get('/budgetLines-paginated',
  validatorHandler(querySalesBudgetLineSchema, 'query'),
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

// GET /:codeBudget/:lineNo (Obtener una línea específica por su clave primaria compuesta)
router.get('/:codeBudget/:lineNo',
  validatorHandler(getSalesBudgetLineSchema, 'params'),
  async (req, res, next) => {
    const { codeBudget, lineNo } = req.params;
    console.time(`Tiempo de consulta para línea de presupuesto ${codeBudget}-${lineNo}`);
    try {
      // Pasar un objeto con ambas partes de la PK al servicio
      const salesBudgetLine = await service.findOne({ codeBudget, lineNo });
      console.timeEnd(`Tiempo de consulta para línea de presupuesto ${codeBudget}-${lineNo}`);
      res.json(salesBudgetLine);
    } catch (error) {
      next(error);
    }
  }
);

// GET / (Obtener todas las líneas sin paginación - si es necesario)
router.get('/',
  validatorHandler(querySalesBudgetLineSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a líneas de presupuesto");
    try {
      const salesBudgetLines = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a líneas de presupuesto");
      res.json(salesBudgetLines);
    } catch (error) {
      next(error);
    }
  }
);


router.post('/:codeBudget', // Aquí 'codeBudget' viene de los parámetros de la URL
  validatorHandler(getSalesBudgetLineSchema, 'params'), // Valida que el codeBudget en params sea válido
  validatorHandler(createSalesBudgetLineSchema, 'body'), // Valida el resto de los datos de la línea
  async (req, res, next) => {
    try {
      const { codeBudget } = req.params; // Obtener codeBudget de la URL
      const body = req.body; // El body contendrá lineNo, codeItem, description, etc.
      // Combinar codeBudget de params con el resto del body
      const newSalesBudgetLine = await service.create({ ...body, codeBudget });
      res.status(201).json(newSalesBudgetLine);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `Una línea de presupuesto con el mismo 'codeBudget' y 'lineNo' ya existe.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);


// PATCH /:codeBudget/:lineNo (Actualizar una línea por su clave primaria compuesta)
router.patch('/:codeBudget/:lineNo',
  validatorHandler(getSalesBudgetLineSchema, 'params'), // Valida codeBudget y lineNo
  validatorHandler(updateSalesBudgetLineSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH para línea de presupuesto');
      const { codeBudget, lineNo } = req.params;
      const body = req.body;
      // Pasar un objeto con la PK completa
      const salesBudgetLine = await service.update({ codeBudget, lineNo }, body);
      res.json(salesBudgetLine);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:codeBudget/:lineNo (Eliminar una línea por su clave primaria compuesta)
router.delete('/:codeBudget/:lineNo',
  validatorHandler(getSalesBudgetLineSchema, 'params'), // Valida codeBudget y lineNo
  async (req, res, next) => {
    try {
      const { codeBudget, lineNo } = req.params;
      await service.delete({ codeBudget, lineNo }); // Pasar un objeto con la PK completa
      res.status(200).json({ codeBudget, lineNo, message: 'Línea de presupuesto eliminada correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
