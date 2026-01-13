
const { Company, CompanySchema } = require('./company.model');
const { Vendor, VendorSchema } = require('./vendor.model');
const { Customer, CustomerSchema } = require('./customer.model');
const { Products, ProductSchema } = require('./products.model');
const { UnitMeasure, UnitMeasureSchema } = require('./unitMeasure.model');
const { salesBudget, salesBudgetSchema } = require('./salesBudget.model');
const { salesBudgetLine, salesBudgetLineSchema } = require('./salesBudgetLines.model');
const { salesInvoice, salesInvoiceSchema } = require('./salesInvoice.model');
const { salesInvoiceLine, salesInvoicetLineSchema } = require('./salesInvoiceLine.model');
const { salesPostInvoice, salesPostInvoiceSchema } = require('./salesPostInvoice.model');
const { salesPostInvoiceLine, salesPostInvoicetLineSchema } = require('./salesPostInvoiceLine.model');
const { purchInvoice, purchInvoiceSchema } = require('./purchInvoice.model');
const { purchInvoiceLine, purchInvoiceLineSchema } = require('./purchInvoiceLine.model');
const { purchpostInvoice, purchPostInvoiceSchema } = require('./purchPostInvoice.model');
const { purchPostInvoiceLine, purchPostInvoiceLineSchema } = require('./purchPostInvoiceLine.model');
const { seriesNumber, seriesNumberSchema } = require('./SeriesNumber.model');

function setupModels(sequelize) {
  // 1. Inicialización de modelos
  Company.init(CompanySchema, Company.config(sequelize));
  Vendor.init(VendorSchema, Vendor.config(sequelize));
  Customer.init(CustomerSchema, Customer.config(sequelize));
  Products.init(ProductSchema, Products.config(sequelize));
  UnitMeasure.init(UnitMeasureSchema, UnitMeasure.config(sequelize));
  salesBudget.init(salesBudgetSchema, salesBudget.config(sequelize));
  salesBudgetLine.init(salesBudgetLineSchema, salesBudgetLine.config(sequelize));
  salesInvoice.init(salesInvoiceSchema, salesInvoice.config(sequelize));
  salesInvoiceLine.init(salesInvoicetLineSchema, salesInvoiceLine.config(sequelize));
  salesPostInvoice.init(salesPostInvoiceSchema, salesPostInvoice.config(sequelize));
  salesPostInvoiceLine.init(salesPostInvoicetLineSchema, salesPostInvoiceLine.config(sequelize));
  purchInvoice.init(purchInvoiceSchema, purchInvoice.config(sequelize));
  purchInvoiceLine.init(purchInvoiceLineSchema, purchInvoiceLine.config(sequelize));
  purchpostInvoice.init(purchPostInvoiceSchema, purchpostInvoice.config(sequelize));
  purchPostInvoiceLine.init(purchPostInvoiceLineSchema, purchPostInvoiceLine.config(sequelize));
  seriesNumber.init(seriesNumberSchema, seriesNumber.config(sequelize));

  // 2. Definición de asociaciones (debe hacerse DESPUÉS de la inicialización de TODOS los modelos)
  Company.associate(sequelize.models);
  Vendor.associate(sequelize.models);
  Customer.associate(sequelize.models);
  Products.associate(sequelize.models);
  UnitMeasure.associate(sequelize.models);
  salesBudget.associate(sequelize.models);
  salesBudgetLine.associate(sequelize.models);
  salesInvoice.associate(sequelize.models);
  salesInvoiceLine.associate(sequelize.models);
  salesPostInvoice.associate(sequelize.models);
  purchInvoice.associate(sequelize.models);
  purchInvoiceLine.associate(sequelize.models);
  purchpostInvoice.associate(sequelize.models);
  purchPostInvoiceLine.associate(sequelize.models);
  seriesNumber.associate(sequelize.models);
}

module.exports = setupModels;
