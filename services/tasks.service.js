const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const { models } = require('../libs/sequelize');

// Un empleado no-admin nunca ve ni modifica tareas asignadas a otro -mismo
// criterio para "verla" y para "cambiarle el estado", centralizado aquí para
// no repetirlo en cada método del service.
function assertOwnerOrAdmin(task, requester) {
  const isAdmin = (requester.role || '').toLowerCase() === 'admin';
  if (!isAdmin && task.assignedTo !== requester.code) {
    throw boom.forbidden('No puedes ver ni modificar tareas asignadas a otro empleado.');
  }
}

// Adjuntamos el edificio en las lecturas (findAll/findMine/findOne) para que
// la app pueda mostrar su dirección/administrador sin una segunda llamada -
// solo los campos que interesan en el móvil, no el contrato completo-.
const BUILDING_INCLUDE = {
  model: models.Building,
  as: 'building',
  attributes: ['id', 'name', 'address', 'city', 'administratorName', 'administratorPhone']
};

class TasksService {

  /**
   * Crear tarea: exclusivo de admin (ver checkRole en el router). assignedTo
   * ya no tiene FK física (ver migración drop_tasks_assigned_to_fk: ahora
   * apunta a employees.code, no a users.code, y una FK solo puede apuntar a
   * una tabla), así que se valida aquí que el empleado exista de verdad -
   * mismo criterio que buildingId-.
   */
  async create(data, createdBy) {
    const employee = await models.Employee.findByPk(data.assignedTo);
    if (!employee) throw boom.notFound('Empleado no encontrado');

    if (data.buildingId) {
      const building = await models.Building.findByPk(data.buildingId);
      if (!building) throw boom.notFound('Edificio no encontrado');
    }
    return models.Task.create({ ...data, createdBy });
  }

  /**
   * Vista global de admin ("Ver estados globales" en Gestión/Oficina):
   * todas las tareas, filtrables por status/type, sin excluir ninguna -a
   * diferencia de findMine, aquí sí interesa ver completadas/canceladas-.
   */
  async findAll({ status, type, limit, offset } = {}) {
    const options = {
      where: {},
      order: [['createdAt', 'DESC']],
    };

    if (status) options.where.status = status;
    if (type) options.where.type = type;
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);
    options.include = [BUILDING_INCLUDE];

    return models.Task.findAll(options);
  }

  /**
   * Tareas del propio empleado autenticado (pestaña "Tareas" del móvil,
   * mismo espíritu "to-do" que el de facturas pendientes: solo lo activo,
   * lo ya resuelto desaparece de la lista en vez de acumularse).
   */
  async findMine(userCode) {
    return models.Task.findAll({
      where: {
        assignedTo: userCode,
        status: { [Op.notIn]: ['COMPLETADA', 'CANCELADA'] }
      },
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
      include: [BUILDING_INCLUDE]
    });
  }

  /** Detalle completo para el modal del móvil. */
  async findOne(id, requester) {
    const task = await models.Task.findByPk(id, { include: [BUILDING_INCLUDE] });
    if (!task) throw boom.notFound('Tarea no encontrada');
    assertOwnerOrAdmin(task, requester);
    return task;
  }

  /**
   * Actualizar SOLO el estado: la acción "Actualizar estado / Subir parte"
   * del dashboard móvil (externo no llega aquí -solo tiene VIEW, bloqueado
   * ya en el router con checkRole-).
   */
  async updateStatus(id, status, requester) {
    const task = await models.Task.findByPk(id);
    if (!task) throw boom.notFound('Tarea no encontrada');
    assertOwnerOrAdmin(task, requester);
    await task.update({ status });
    // Recargamos con el edificio incluido -si no, el modal del móvil pierde
    // de golpe la fila "Edificio"/"Administrador" en cuanto se avanza el
    // estado, aunque buildingId siga intacto, porque .update() en la
    // instancia no reconsulta las asociaciones ya cargadas-.
    return task.reload({ include: [BUILDING_INCLUDE] });
  }

  /** Edición completa: exclusiva de admin (ver checkRole en el router). */
  async update(id, changes) {
    const task = await models.Task.findByPk(id);
    if (!task) throw boom.notFound('Tarea no encontrada');
    if (changes.assignedTo) {
      const employee = await models.Employee.findByPk(changes.assignedTo);
      if (!employee) throw boom.notFound('Empleado no encontrado');
    }
    if (changes.buildingId) {
      const building = await models.Building.findByPk(changes.buildingId);
      if (!building) throw boom.notFound('Edificio no encontrado');
    }
    await task.update(changes);
    return task.reload({ include: [BUILDING_INCLUDE] });
  }

  /** Borrar: exclusivo de admin (ver checkRole en el router). */
  async delete(id) {
    const task = await models.Task.findByPk(id);
    if (!task) throw boom.notFound('Tarea no encontrada');
    await task.destroy();
    return { id };
  }
}

module.exports = TasksService;
