const express = require('express');
const licenseGate = require('../middlewares/licenseGate');

const setupRouter = require('./setup.router');
const licenseRouter = require('./license.router');
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
const purchPostInvoiceLinesRouter = require('./purchPostInvoiceLines.router');
const seiresNumberRouter = require('./seriesNumber.router');
const verifactuLogsRouter = require('./verifactulogs.router');
const verifactuRouter = require('./verifactu.router');
const configRouter = require('./config.router');
const moduleConfigRouter = require('./moduleConfig.router');
const verifactuConfigRouter = require('./verifactuConfig.router');
const operatingExpenses = require('./operatingExpenses.router');
const conexionRouter = require('./conexion.router');
const authRouter = require('./auth.router');
const notificationsRouter = require('./notifications.router');
const mailAccountsRouter = require('./mailAccounts.router');
const mailRouter = require('./mail.router');
const geocodingRouter = require('./geocoding.router');
const incidentReportsRouter = require('./incidentReports.router');

// Rutas internas que no apuntan a tablas
const statsRouter = require('./stats.router');
const enumsRouter = require('./enums.router');

function routerApi(app) {
  const router = express.Router();
  app.use('/api/v1', router);

  // Puerta de licencia/trial: primero, para que aplique a todo lo de abajo.
  // Deja pasar sin más /setup, /license y /users/login (ver licenseGate.js).
  router.use(licenseGate);

  router.use('/setup', setupRouter);
  router.use('/license', licenseRouter);
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
  router.use('/purchPostInvoiceLines', purchPostInvoiceLinesRouter);
  router.use('/seriesNumber', seiresNumberRouter);
  router.use('/verifactuLogs', verifactuLogsRouter);
  router.use('/verifactu', verifactuRouter);
  router.use('/config', configRouter);
  router.use('/moduleConfig', moduleConfigRouter);
  router.use('/verifactuConfig', verifactuConfigRouter);
  router.use('/operatingExpenses', operatingExpenses);
  router.use('/stats', statsRouter);
  router.use('/enums', enumsRouter);
  router.use('/conexion', conexionRouter);
  router.use('/auth', authRouter);
  router.use('/notifications', notificationsRouter);
  router.use('/mail-accounts', mailAccountsRouter);
  router.use('/mail', mailRouter);
  router.use('/geocoding', geocodingRouter);
  router.use('/incident-reports', incidentReportsRouter);
}

module.exports = routerApi;
