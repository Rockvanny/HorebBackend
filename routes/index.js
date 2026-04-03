const express = require('express');

const usersRouter = require('./users.router');
const entitiesRouter = require('./entities.router');
const companyRouter = require('./company.router');
const productsRouter = require('./product.router');
const customersRouter = require('./customers.router');
const vendorsRouter = require('./vendors.router');
const unitMeasuresRouter = require('./unitMeasures.router');
const salesBudgetRouter = require('./salesBudgets.router');
const salesBudgetLines = require('./salesBudgetLines.router');
const salesInvoiceRouter = require('./salesInvoices.router');
const salesInvoiceLines = require('./salesInvoiceLines.router');
const salesPostInvoiceRouter = require('./salesPostInvoice.router');
const purchInvoiceRouter = require('./purchInvoice.router');
const purchInvoiceLinesRouter = require('./purchInvoiceLines.router');
const purchPostInvoiceRouter = require('./purchPostInvoice.router');
const seiresNumberRouter = require('./seriesNumber.router');
const config = require('./config.router');
const statsRouter = require('./stats.router');

function routerApi(app) {
  const router = express.Router();
  app.use('/api/v1', router);

  router.use('/users', usersRouter);
  router.use('/entities', entitiesRouter);
  router.use('/company', companyRouter);
  router.use('/products', productsRouter);
  router.use('/customers', customersRouter);
  router.use('/vendors', vendorsRouter);
  router.use('/unitMeasures', unitMeasuresRouter);
  router.use('/salesBudgets', salesBudgetRouter);
  router.use('/salesBudgetLines', salesBudgetLines);
  router.use('/salesInvoices', salesInvoiceRouter);
  router.use('/salesInvoiceLines', salesInvoiceLines);
  router.use('/salesPostInvoices', salesPostInvoiceRouter);
  router.use('/purchInvoices', purchInvoiceRouter);
  router.use('/purchInvoiceLines', purchInvoiceLinesRouter);
  router.use('/purchPostInvoices', purchPostInvoiceRouter);
  router.use('/seriesNumber', seiresNumberRouter);
  router.use('/config', config);
  router.use('/stats', statsRouter);
}

module.exports = routerApi;
