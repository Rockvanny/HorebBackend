const { create } = require('xmlbuilder2');

// Namespaces reales del esquema oficial (ver resources/verifactu-xsd/):
// - SFLR_NS: SuministroLR.xsd -SOLO el sobre exterior (RegFactuSistemaFacturacion,
//   Cabecera, RegistroFactura)-.
// - SF_NS: SuministroInformacion.xsd -todo lo demás (RegistroAlta y cada
//   campo dentro), incluido ObligadoEmision dentro de la propia Cabecera-.
// Un solo namespace para todo (como se hacía antes) no valida: xmllint lo
// confirma con "No matching global declaration available for the
// validation root" en cuanto el elemento raíz no está en el namespace que
// declara su propio esquema.
const SFLR_NS = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';
const SF_NS = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd';

class VerifactuXmlService {
  constructor() { }

  /**
   * `payload` es el objeto guardado en verifactu_logs.payload (ver
   * services/verifactulogs.service.js#createLog), con la misma forma que
   * RegistroFacturacionAltaType del esquema oficial -este método solo lo
   * vuelca a XML, no reinterpreta ni recalcula nada-.
   */
  generateInvoiceXml(payload, fingerprint) {
    const encadenamiento = payload.encadenamiento?.primerRegistro
      ? { 'sf:PrimerRegistro': payload.encadenamiento.primerRegistro }
      : {
        'sf:RegistroAnterior': {
          'sf:IDEmisorFactura': payload.encadenamiento.registroAnterior.idEmisorFactura,
          'sf:NumSerieFactura': payload.encadenamiento.registroAnterior.numSerieFactura,
          'sf:FechaExpedicionFactura': payload.encadenamiento.registroAnterior.fechaExpedicionFactura,
          'sf:Huella': payload.encadenamiento.registroAnterior.huella,
        }
      };

    const xmlObj = {
      'sfLR:RegFactuSistemaFacturacion': {
        '@xmlns:sfLR': SFLR_NS,
        '@xmlns:sf': SF_NS,
        'sfLR:Cabecera': {
          'sf:ObligadoEmision': {
            'sf:NombreRazon': payload.nombreRazonEmisor,
            'sf:NIF': payload.idFactura.idEmisorFactura,
          }
        },
        'sfLR:RegistroFactura': {
          'sf:RegistroAlta': {
            'sf:IDVersion': payload.idVersion,
            'sf:IDFactura': {
              'sf:IDEmisorFactura': payload.idFactura.idEmisorFactura,
              'sf:NumSerieFactura': payload.idFactura.numSerieFactura,
              'sf:FechaExpedicionFactura': payload.idFactura.fechaExpedicionFactura,
            },
            'sf:NombreRazonEmisor': payload.nombreRazonEmisor,
            'sf:TipoFactura': payload.tipoFactura,
            // Rectificativas (R1-R5): TipoRectificativa y FacturasRectificadas van
            // justo aquí en la secuencia -entre TipoFactura y DescripcionOperacion-,
            // según RegistroFacturacionAltaType (ambos minOccurs="0", se omiten por
            // completo si la factura no es una rectificativa con origen conocido).
            ...(payload.tipoRectificativa ? { 'sf:TipoRectificativa': payload.tipoRectificativa } : {}),
            ...(payload.facturasRectificadas?.length ? {
              'sf:FacturasRectificadas': {
                'sf:IDFacturaRectificada': payload.facturasRectificadas.map((f) => ({
                  'sf:IDEmisorFactura': f.idEmisorFactura,
                  'sf:NumSerieFactura': f.numSerieFactura,
                  'sf:FechaExpedicionFactura': f.fechaExpedicionFactura,
                }))
              }
            } : {}),
            'sf:DescripcionOperacion': payload.descripcionOperacion,
            'sf:Desglose': {
              'sf:DetalleDesglose': payload.desglose.map((d) => ({
                'sf:Impuesto': d.impuesto,
                'sf:CalificacionOperacion': d.calificacionOperacion,
                'sf:TipoImpositivo': d.tipoImpositivo,
                'sf:BaseImponibleOimporteNoSujeto': d.baseImponibleOimporteNoSujeto,
                'sf:CuotaRepercutida': d.cuotaRepercutida,
              }))
            },
            'sf:CuotaTotal': payload.cuotaTotal,
            'sf:ImporteTotal': payload.importeTotal,
            'sf:Encadenamiento': encadenamiento,
            'sf:SistemaInformatico': {
              'sf:NombreRazon': payload.sistemaInformatico.nombreRazon,
              'sf:NIF': payload.sistemaInformatico.nif,
              'sf:NombreSistemaInformatico': payload.sistemaInformatico.nombreSistemaInformatico,
              'sf:IdSistemaInformatico': payload.sistemaInformatico.idSistemaInformatico,
              'sf:Version': payload.sistemaInformatico.version,
              'sf:NumeroInstalacion': payload.sistemaInformatico.numeroInstalacion,
              'sf:TipoUsoPosibleSoloVerifactu': payload.sistemaInformatico.tipoUsoPosibleSoloVerifactu,
              'sf:TipoUsoPosibleMultiOT': payload.sistemaInformatico.tipoUsoPosibleMultiOT,
              'sf:IndicadorMultiplesOT': payload.sistemaInformatico.indicadorMultiplesOT,
            },
            'sf:FechaHoraHusoGenRegistro': payload.fechaHoraHusoGenRegistro,
            'sf:TipoHuella': payload.tipoHuella,
            'sf:Huella': fingerprint,
          }
        }
      }
    };

    return create({ version: '1.0', encoding: 'UTF-8' }, xmlObj).end({ prettyPrint: true });
  }
}

module.exports = VerifactuXmlService;
