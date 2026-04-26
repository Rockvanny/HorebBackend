const express = require('express');

const usersRouter = require('./users.router');
const companyRouter = require('./company.router');
const productsRouter = require('./product.router');
const customersRouter = require('./customers.router');
const vendorsRouter = require('./vendors.router');
const salesBudgetRouter = require('./salesBudgets.router');
const salesBudgetLinesRouter = require('./salesBudgetLines.router');
const salesInvoiceRouter = require('./salesInvoices.router');
const salesInvoiceLinesRouter = require('./salesInvoiceLines.router');
const documentTaxRouter = require('./documentTax.router');
const salesPostInvoiceRouter = require('./salesPostInvoice.router');
const salesPostInvoiceTaxesRouter = require('./salesPostInvoiceTax.router');
const purchInvoiceRouter = require('./purchInvoice.router');
const purchInvoiceLinesRouter = require('./purchInvoiceLines.router');
const purchPostInvoiceRouter = require('./purchPostInvoice.router');
const seiresNumberRouter = require('./seriesNumber.router');
const verifactuLogsRouter = require('./verifactuLogs.router');
const configRouter = require('./config.router');

// Rutas internas que no apuntan a tablas
const statsRouter = require('./stats.router');
const enumsRouter = require('./enums.router');

function routerApi(app) {
  const router = express.Router();
  app.use('/api/v1', router);

  router.use('/users', usersRouter);
  router.use('/company', companyRouter);
  router.use('/products', productsRouter);
  router.use('/customers', customersRouter);
  router.use('/vendors', vendorsRouter);
  router.use('/salesBudgets', salesBudgetRouter);
  router.use('/salesBudgetLines', salesBudgetLinesRouter);
  router.use('/salesInvoices', salesInvoiceRouter);
  router.use('/salesInvoiceLines', salesInvoiceLinesRouter);
  router.use('/document-taxes', documentTaxRouter);
  router.use('/salesPostInvoices', salesPostInvoiceRouter);
  router.use('/sales-post-invoice-taxes', salesPostInvoiceTaxesRouter);
  router.use('/purchInvoices', purchInvoiceRouter);
  router.use('/purchInvoiceLines', purchInvoiceLinesRouter);
  router.use('/purchPostInvoices', purchPostInvoiceRouter);
  router.use('/seriesNumber', seiresNumberRouter);
  router.use('/verifactuLogs', verifactuLogsRouter);
  router.use('/config', configRouter);
  router.use('/stats', statsRouter);
  router.use('/enums', enumsRouter);
}

module.exports = routerApi;
