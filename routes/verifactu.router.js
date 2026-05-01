const express = require('express');
const validatorHandler = require('../middlewares/validator.handler');
const { getVerifactuSchema } = require('../schemas/verifactu.schema');
const VerifactuService = require('../services/verifactu.service');
const VerifactuXmlService = require('../services/verifactuXml.service');

const router = express.Router();
const service = new VerifactuService();
const xmlService = new VerifactuXmlService();

// GET para descargar el archivo
router.get('/download-xml/:invoiceCode',
  validatorHandler(getVerifactuSchema, 'params'), // <-- AQUÍ USAS EL SCHEMA
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;

      // 1. Recuperamos el log de la DB usando el servicio que ya teníamos
      const log = await service.getTraceability(invoiceCode);

      // 2. Convertimos el payload (JSON) a XML
      const payload = JSON.parse(log.payload);
      const xmlContent = xmlService.generateInvoiceXml(payload, log.fingerprint);

      // 3. Forzamos la descarga en el navegador
      res.header('Content-Type', 'application/xml');
      res.attachment(`Verifactu_${invoiceCode}.xml`);
      res.send(xmlContent);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
