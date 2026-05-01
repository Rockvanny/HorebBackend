const { create } = require('xmlbuilder2');

class VerifactuXmlService {
  constructor() {}

  generateInvoiceXml(payload, fingerprint) {
    // Estructura siguiendo el esquema oficial de la AEAT para Veri*factu
    const xmlObj = {
      'vfactu:RegFactuSistemaFacturacion': {
        '@xmlns:vfactu': 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RegFactuSistemaFacturacion.xsd',
        'vfactu:Cabecera': {
          'vfactu:ObligadoEmision': {
            'vfactu:NombreRazon': payload.emisor.nombre,
            'vfactu:NIF': payload.emisor.nif
          }
        },
        'vfactu:RegistroFactura': {
          'vfactu:IDFactura': {
            'vfactu:SerieNumeroFactura': payload.factura.numero_serie,
            'vfactu:FechaExpedicionFactura': payload.factura.fecha_emision
          },
          'vfactu:NombreRazonExpedidor': payload.emisor.nombre,
          'vfactu:TipoFactura': payload.factura.tipo_factura,
          'vfactu:CuotaTotal': payload.factura.cuota_total,
          'vfactu:ImporteTotal': payload.factura.importe_total,
          'vfactu:DesgloseIVA': {
            'vfactu:DetalleIVA': payload.factura.desglose.map(d => ({
              'vfactu:ClaveRegimen': d.clave_regimen,
              'vfactu:TipoImpositivo': d.tipo_impositivo,
              'vfactu:BaseImponible': d.base_imponible,
              'vfactu:CuotaRepercutida': d.cuota_repercutida
            }))
          },
          'vfactu:Encadenamiento': {
            'vfactu:RegistroAnterior': {
              'vfactu:Huella': payload.encadenamiento.huella_anterior
            }
          },
          'vfactu:SistemaInformatico': {
            'vfactu:Nombre': payload.sistema_informatico.nombre,
            'vfactu:Version': payload.sistema_informatico.version,
            'vfactu:NIFDesarrollador': payload.sistema_informatico.nif_desarrollador
          },
          'vfactu:FechaHoraHito': payload.timestamp,
          'vfactu:Huella': fingerprint
        }
      }
    };

    return create({ version: '1.0', encoding: 'UTF-8' }, xmlObj).end({ prettyPrint: true });
  }
}

module.exports = VerifactuXmlService;
