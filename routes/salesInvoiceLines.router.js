const express = require('express');

const SalesInvoiceLineService = require('../services/salesInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');

// Esquemas específicos para las líneas de presupuesto
const {
  createSalesInvoiceLineSchema,
  getSalesInvoiceLineSchema,    // <-- Este esquema ahora necesitará validar codeInvoice y lineNo
  updateSalesInvoiceLineSchema,
  querySalesInvoiceLineSchema
} = require('../schemas/salesInvoiceLine.schema');

const router = express.Router();
const service = new SalesInvoiceLineService();

// GET /paginated (Obtener todas las líneas con paginación y búsqueda)
router.get('/salesInvoiceLines-paginated',
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
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

// GET /:codeInvoice/:lineNo (Obtener una línea específica por su clave primaria compuesta)
router.get('/:codeInvoice/:lineNo',
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    const { codeInvoice, lineNo } = req.params;
    console.time(`Tiempo de consulta para línea de presupuesto ${codeInvoice}-${lineNo}`);
    try {
      // Pasar un objeto con ambas partes de la PK al servicio
      const salesInvoiceLine = await service.findOne({ codeInvoice, lineNo });
      console.timeEnd(`Tiempo de consulta para línea de presupuesto ${codeInvoice}-${lineNo}`);
      res.json(salesInvoiceLine);
    } catch (error) {
      next(error);
    }
  }
);

// GET / (Obtener todas las líneas sin paginación - si es necesario)
router.get('/',
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a líneas de presupuesto");
    try {
      const SalesInvoiceLines = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a líneas de presupuesto");
      res.json(SalesInvoiceLines);
    } catch (error) {
      next(error);
    }
  }
);


router.post('/:codeInvoice', // Aquí 'codeInvoice' viene de los parámetros de la URL
  validatorHandler(getSalesInvoiceLineSchema, 'params'), // Valida que el codeInvoice en params sea válido
  validatorHandler(createSalesInvoiceLineSchema, 'body'), // Valida el resto de los datos de la línea
  async (req, res, next) => {
    try {
      const { codeInvoice } = req.params; // Obtener codeInvoice de la URL
      const body = req.body; // El body contendrá lineNo, codeItem, description, etc.
      // Combinar codeInvoice de params con el resto del body
      const newSalesInvoiceLine = await service.create({ ...body, codeInvoice });
      res.status(201).json(newSalesInvoiceLine);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `Una línea de presupuesto con el mismo 'codeInvoice' y 'lineNo' ya existe.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);


// PATCH /:codeInvoice/:lineNo (Actualizar una línea por su clave primaria compuesta)
router.patch('/:codeInvoice/:lineNo',
  validatorHandler(getSalesInvoiceLineSchema, 'params'), // Valida codeInvoice y lineNo
  validatorHandler(updateSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH para línea de presupuesto');
      const { codeInvoice, lineNo } = req.params;
      const body = req.body;
      // Pasar un objeto con la PK completa
      const salesInvoiceLine = await service.update({ codeInvoice, lineNo }, body);
      res.json(salesInvoiceLine);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:codeInvoice/:lineNo (Eliminar una línea por su clave primaria compuesta)
router.delete('/:codeInvoice/:lineNo',
  validatorHandler(getSalesInvoiceLineSchema, 'params'), // Valida codeInvoice y lineNo
  async (req, res, next) => {
    try {
      const { codeInvoice, lineNo } = req.params;
      await service.delete({ codeInvoice, lineNo }); // Pasar un objeto con la PK completa
      res.status(200).json({ codeInvoice, lineNo, message: 'Línea de presupuesto eliminada correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
