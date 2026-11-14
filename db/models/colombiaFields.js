const { DataTypes } = require('sequelize');

/**
 * Campos propios de Colombia (migración
 * 20261115100000-installation_settings_and_colombia_fields.js). Solo se
 * usan en instalaciones con país CO; los de España no se tocan. Valores
 * válidos en libs/colombia.js.
 */
const col = (field, length) => ({ field, allowNull: true, type: DataTypes.STRING(length) });

/** Clientes, proveedores y empresa */
const colombiaPartyAttributes = () => ({
  coPersonType: col('co_person_type', 10),
  coIdType: col('co_id_type', 5),
  coIdNumber: col('co_id_number', 20),
  coCheckDigit: col('co_check_digit', 1),
  coDepartment: col('co_department', 2),
  coMunicipality: col('co_municipality', 80),
  coTaxRegime: col('co_tax_regime', 20)
});

/** Empleados (sin tipo de persona, dígito de verificación ni régimen) */
const colombiaPersonAttributes = () => ({
  coIdType: col('co_id_type', 5),
  coIdNumber: col('co_id_number', 20),
  coDepartment: col('co_department', 2),
  coMunicipality: col('co_municipality', 80)
});

module.exports = { colombiaPartyAttributes, colombiaPersonAttributes };
