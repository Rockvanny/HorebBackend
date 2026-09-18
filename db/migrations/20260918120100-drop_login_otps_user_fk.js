'use strict';

// login_otps.user_code tenía una FK física a users(code) (ver
// 20260906120000-create_login_otps_table.js). Con el login de clientes
// (customers.service.js) el mismo campo también guarda códigos de la tabla
// 'customers' -de otro tipo de código-, así que esa FK rechazaría el INSERT
// con un error de integridad referencial. Se quita la restricción física; la
// columna se sigue rellenando igual, solo deja de forzarse contra 'users'
// (es una tabla de retos efímeros con caducidad corta, no datos de negocio:
// perder esa comprobación aquí no arriesga integridad real).
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.removeConstraint('login_otps', 'login_otps_user_code_fkey');
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.addConstraint('login_otps', {
      fields: ['user_code'],
      type: 'foreign key',
      name: 'login_otps_user_code_fkey',
      references: { table: 'users', field: 'code' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  }
};
