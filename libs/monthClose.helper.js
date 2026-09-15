/**
 * Reglas de "cierre de mes" para Gastos Operativos: bloqueo automático de
 * edición por fecha (sin depender de una acción manual) y cálculo del aviso
 * de revisión, contando solo días laborables (excluye sábados y domingos).
 */

const REVIEW_REMINDER_BUSINESS_DAYS = 2;

function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Un gasto queda bloqueado en cuanto su mes calendario ya no es el mes en curso,
 * sin necesidad de que nadie ejecute "validar mes anterior" manualmente.
 */
function isExpenseMonthClosed(expenseDate, referenceDate = new Date()) {
  const d = new Date(expenseDate);
  return d.getFullYear() < referenceDate.getFullYear() ||
    (d.getFullYear() === referenceDate.getFullYear() && d.getMonth() < referenceDate.getMonth());
}

/**
 * Días laborables restantes en el mes en curso, contando hoy si es laborable.
 */
function getBusinessDaysRemainingInMonth(referenceDate = new Date()) {
  const lastDay = endOfMonth(referenceDate);
  let count = 0;
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  while (cursor <= lastDay) {
    if (isBusinessDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Determina si hoy cae dentro de la ventana de aviso (1 o 2 días laborables
 * antes del cierre del mes, incluido el propio último día laborable).
 */
function getMonthEndReviewStatus(referenceDate = new Date(), thresholdBusinessDays = REVIEW_REMINDER_BUSINESS_DAYS) {
  const businessDaysRemaining = getBusinessDaysRemainingInMonth(referenceDate);
  return {
    withinReminderWindow: businessDaysRemaining > 0 && businessDaysRemaining <= thresholdBusinessDays,
    businessDaysRemaining,
  };
}

module.exports = {
  REVIEW_REMINDER_BUSINESS_DAYS,
  isBusinessDay,
  startOfMonth,
  endOfMonth,
  isExpenseMonthClosed,
  getBusinessDaysRemainingInMonth,
  getMonthEndReviewStatus,
};
