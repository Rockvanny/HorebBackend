# Esquemas oficiales Veri*Factu (AEAT)

Copia local de los XSD oficiales, para poder validar el XML generado
(`VerifactuXml.service.js`) sin conexión a internet. Usados por
`services/verifactuXmlValidator.service.js`.

Descargados el 2026-09-16 desde la página oficial de esquemas de
desarrolladores de la AEAT:
https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Esquemas_de_los_servicios_web/Esquemas_de_los_servicios_web.html

| Fichero | Origen | Notas |
|---|---|---|
| `SuministroLR.xsd` | `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd` | Esquema principal: elemento raíz `RegFactuSistemaFacturacion`. Sin cambios respecto al original. |
| `SuministroInformacion.xsd` | `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd` | Tipos comunes (`RegistroAlta`, `CabeceraType`, etc). **Modificado**: el `<import>` de xmldsig apuntaba a una URL remota (`http://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd`); se cambió a la copia local `xmldsig-core-schema.xsd` para poder validar sin red. |
| `xmldsig-core-schema.xsd` | `http://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd` (W3C) | Dependencia de `SuministroInformacion.xsd` (elemento opcional `ds:Signature`, no usado hoy por `VerifactuXml.service.js`). Sin cambios. |

Si la AEAT publica una versión nueva del esquema, hay que repetir la
descarga y volver a aplicar el mismo cambio de `schemaLocation` en
`SuministroInformacion.xsd`.
