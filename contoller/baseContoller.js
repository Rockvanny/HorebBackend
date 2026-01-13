// controllers/entityController.js
const sequelize = require('../libs/sequelize');

const CustomerService = require('../services/customers.service');
const VendorService = require('../services/vendors.service');
const ProductService = require('../services/products.service');

const services = {
  customer: new CustomerService(),
  vendor: new VendorService(),
  products: new ProductService()
};

const entityController = {
  async createEntity(req, res) {
    // 1. Iniciamos la transacción usando la instancia unificada
    const transaction = await sequelize.transaction();

    try {
      //1. Recibimos los tipos y datos desde el cuerpo de la solicitud
      const { type, seriesId, entityData } = req.body;

      // 2. Ejecutamos la lógica de la serie (CLI000 -> CLI001)
      // Pasamos la transacción para que el incremento de la serie y el guardado sean atómicos
      const newCode = await this.updateLastUsedSerie(type, seriesId, { transaction });

      // 3. Mapeo dinámico del modelo según el tipo recibido
      // Si type es 'customer', buscamos 'Customer' en sequelize.models
      const modelName = type.charAt(0).toUpperCase() + type.slice(1);
      const TargetModel = sequelize.models[modelName];

      if (!TargetModel) {
        throw new Error(`El modelo para el tipo "${type}" (${modelName}) no está definido en Sequelize.`);
      }

      // 4. CREACIÓN DEL REGISTRO
      // Mezclamos los datos del formulario con el nuevo código generado
      const record = await TargetModel.create({
        ...entityData,
        code: newCode // Aquí se asigna el CLI001, CLI002, etc.
      }, { transaction });

      // 5. ÉXITO: Confirmamos los cambios en la DB
      await transaction.commit();

      console.log(`✅ Registro creado exitosamente en ${modelName} con código ${newCode}`);

      res.status(201).json({
        success: true,
        data: record
      });

    } catch (error) {
      // 6. ERROR: Deshacemos todo (no se incrementa la serie ni se crea el registro)
      if (transaction) await transaction.rollback();

      console.error("❌ Error en createEntity:", error.message);

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async deleteEntity(req, res) {
    try {
      const { type, code } = req.params;

      // 1. Usamos tu lógica de mapeo para validar el tipo (igual que en create)
      const TargetModel = this.getModelByType(type);
      if (!TargetModel) {
        throw new Error(`El modelo para el tipo "${type}" no está definido.`);
      }

      // 2. IMPORTANTE: Llamamos al SERVICIO, no al modelo.
      // El servicio tiene el código que mira si hay facturas.
      const service = services[type];
      if (!service) {
        throw new Error(`No hay un servicio de validación configurado para ${type}`);
      }

      const result = await service.delete(code);

      res.status(200).json({
        success: true,
        message: `${type} eliminado correctamente`,
        data: result
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  getModelByType(type) {
    // AJUSTE: Mapeamos los 'type' de tu tabla series con los nombres reales de tus modelos en Sequelize
    const modelsMap = {
      'customer': sequelize.models.Customer,  // Según tu tabla, el type es 'customer'
      'vendor': sequelize.models.Vendor,
      'products': sequelize.models.Products
    };
    return modelsMap[type];
  },

  async updateLastUsedSerie(type, startSerie, options = {}) {
    const { transaction } = options;
    const { seriesNumber } = sequelize.models;

    try {
      const model = await seriesNumber.findOne({
        // CORRECTO: Usamos 'startSerie' (nombre en JS)
        where: {
          type: type,
          startSerie: startSerie
        },
        transaction
      });

      if (!model) {
        throw new Error(`No se encontró la serie con type: ${type}, serie: ${startSerie}`);
      }

      // CORRECTO: Accedemos a 'lastSerie' (nombre en JS)
      const currentLast = model.lastSerie || startSerie;

      const prefixMatch = currentLast.match(/[A-Za-z]+/);
      const numberMatch = currentLast.match(/\d+/);

      if (!prefixMatch || !numberMatch) {
        throw new Error(`El formato de serie "${currentLast}" no es válido.`);
      }

      const prefix = prefixMatch[0];
      const numberPart = numberMatch[0];
      const nextNumber = parseInt(numberPart) + 1;
      const newNumberStr = String(nextNumber).padStart(numberPart.length, '0');
      const newLastSerie = prefix + newNumberStr;

      // CORRECTO: Actualizamos 'lastSerie'.
      // Sequelize usará 'last_series' en el SQL gracias a tu esquema.
      await model.update({ lastSerie: newLastSerie }, { transaction });

      console.log(`✨ Serie incrementada para ${type}: ${currentLast} -> ${newLastSerie}`);

      return newLastSerie;

    } catch (error) {
      throw new Error("Error al actualizar serie: " + error.message);
    }
  }
};

module.exports = entityController;
