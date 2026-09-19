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

class TasksService {

  /** Crear tarea: exclusivo de admin (ver checkRole en el router). */
  async create(data, createdBy) {
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
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']]
    });
  }

  /** Detalle completo para el modal del móvil. */
  async findOne(id, requester) {
    const task = await models.Task.findByPk(id);
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
    return task.update({ status });
  }

  /** Edición completa: exclusiva de admin (ver checkRole en el router). */
  async update(id, changes) {
    const task = await models.Task.findByPk(id);
    if (!task) throw boom.notFound('Tarea no encontrada');
    return task.update(changes);
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
