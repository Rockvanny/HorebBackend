const express = require('express');
const { getVerifactuSchema } = require('../schemas/verifactu.schema');
const VerifactuService = require('../services/verifactulogs.service');
const VerifactuXmlService = require('../services/VerifactuXml.service');
const VerifactuXmlValidatorService = require('../services/verifactuXmlValidator.service');
const { protectedRoute } = require('../libs/router-factory');

const router = express.Router();
const service = new VerifactuService();
const xmlService = new VerifactuXmlService();
const xmlValidatorService = new VerifactuXmlValidatorService();

// Descarga del XML exportable para modo 'local' (ver
// services/verifactuConfig.service.js): el admin lo sube a mano a la
// plataforma de la AEAT. Reutiliza el permiso ya existente de
// verifactuLogs (módulo SALES).
router.get('/download-xml/:invoiceCode',
  ...protectedRoute('VIEW_VERIFACTULOGS', { params: getVerifactuSchema }),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;

      const log = await service.getTraceability(invoiceCode);

      // payload es JSONB: Sequelize ya lo entrega como objeto, no como
      // string (un JSON.parse aquí rompería con "Unexpected token o").
      const xmlContent = xmlService.generateInvoiceXml(log.payload, log.fingerprint);

      await service.markExported(invoiceCode);

      res.header('Content-Type', 'application/xml');
      res.attachment(`Verifactu_${invoiceCode}.xml`);
      res.send(xmlContent);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Valida el XML (el mismo que descargaría download-xml) contra los
 * esquemas oficiales de la AEAT, sin descargar nada ni tocar exportedAt
 * -es solo una comprobación de forma, se puede repetir tantas veces como
 * se quiera-.
 */
router.get('/validate-xml/:invoiceCode',
  ...protectedRoute('VIEW_VERIFACTULOGS', { params: getVerifactuSchema }),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const log = await service.getTraceability(invoiceCode);
      const xmlContent = xmlService.generateInvoiceXml(log.payload, log.fingerprint);
      const result = await xmlValidatorService.validate(xmlContent);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
