const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);

const XSD_DIR = path.join(__dirname, '../resources/verifactu-xsd');
// SuministroLR.xsd es el esquema raíz (elemento RegFactuSistemaFacturacion);
// importa SuministroInformacion.xsd a su vez (ver resources/verifactu-xsd/README.md).
const MAIN_SCHEMA = path.join(XSD_DIR, 'SuministroLR.xsd');

/**
 * Valida el XML Veri*factu generado (VerifactuXml.service.js) contra los
 * esquemas OFICIALES de la AEAT, en local vía xmllint (libxml2-utils, ver
 * Dockerfile) y sin tocar red (--nonet): es una validación de FORMA -que el
 * XML tiene la estructura, campos y tipos que exige la normativa-, no de que
 * la AEAT vaya a aceptar el envío (eso depende también del contenido y del
 * canal de envío, no solo de la forma).
 */
class VerifactuXmlValidatorService {
  async validate(xmlContent) {
    const tmpFile = path.join(os.tmpdir(), `verifactu-${crypto.randomUUID()}.xml`);
    await fs.writeFile(tmpFile, xmlContent, 'utf8');

    try {
      await execFileAsync('xmllint', ['--noout', '--nonet', '--schema', MAIN_SCHEMA, tmpFile]);
      return { valid: true, errors: [] };
    } catch (error) {
      // xmllint informa los fallos de validación por stderr y sale con
      // código de error != 0 -eso es lo que hace que execFile rechace la
      // promesa, no un fallo de nuestro lado-.
      const output = (error.stderr || error.message || '').toString();
      const errors = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.endsWith('validates') && !line.endsWith('fails to validate'));

      return { valid: false, errors: errors.length ? errors : [output.trim() || 'Error desconocido al validar el XML.'] };
    } finally {
      await fs.unlink(tmpFile).catch(() => { });
    }
  }
}

module.exports = VerifactuXmlValidatorService;
