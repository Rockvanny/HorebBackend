/**
 * Datos propios de Colombia (instalaciones con país CO, ver
 * libs/installationSettings.js). Son campos NUEVOS (co_* en clientes,
 * proveedores, empresa y empleados): los de España (NIF, provincia, código
 * postal...) no se tocan y en Colombia simplemente no se usan.
 */

// Tipos de documento de identificación (la DIAN usa códigos numéricos: se
// mapearán al integrar la factura electrónica)
const ID_TYPES = {
  CC: 'Cédula de ciudadanía',
  NIT: 'NIT',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  TI: 'Tarjeta de identidad',
  PEP: 'Permiso especial de permanencia'
};

const PERSON_TYPES = { NATURAL: 'Persona natural', JURIDICA: 'Persona jurídica' };

const TAX_REGIMES = { RESPONSABLE_IVA: 'Responsable de IVA', NO_RESPONSABLE_IVA: 'No responsable de IVA' };

// Departamentos con su código DANE (los municipios, con el suyo, se
// añadirán cuando tengamos la lista oficial DIVIPOLA)
const DEPARTMENTS = {
  '05': 'Antioquia', '08': 'Atlántico', '11': 'Bogotá D.C.', '13': 'Bolívar', '15': 'Boyacá',
  '17': 'Caldas', '18': 'Caquetá', '19': 'Cauca', '20': 'Cesar', '23': 'Córdoba',
  '25': 'Cundinamarca', '27': 'Chocó', '41': 'Huila', '44': 'La Guajira', '47': 'Magdalena',
  '50': 'Meta', '52': 'Nariño', '54': 'Norte de Santander', '63': 'Quindío', '66': 'Risaralda',
  '68': 'Santander', '70': 'Sucre', '73': 'Tolima', '76': 'Valle del Cauca', '81': 'Arauca',
  '85': 'Casanare', '86': 'Putumayo', '88': 'San Andrés y Providencia', '91': 'Amazonas',
  '94': 'Guainía', '95': 'Guaviare', '97': 'Vaupés', '99': 'Vichada'
};

/**
 * Dígito de verificación del NIT (algoritmo DIAN, módulo 11): cada dígito,
 * de derecha a izquierda, por 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53,
 * 59, 67, 71; resto de dividir la suma entre 11; DV = resto si es 0 o 1,
 * si no 11 - resto.
 */
const NIT_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
const nitCheckDigit = (nit) => {
  const digits = String(nit || '').replace(/\D/g, '');
  if (!digits || digits.length > NIT_WEIGHTS.length) return null;
  const sum = digits.split('').reverse().reduce((acc, d, i) => acc + Number(d) * NIT_WEIGHTS[i], 0);
  const rest = sum % 11;
  return rest > 1 ? 11 - rest : rest;
};

module.exports = { ID_TYPES, PERSON_TYPES, TAX_REGIMES, DEPARTMENTS, nitCheckDigit };
