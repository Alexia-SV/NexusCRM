export const statusConfig = {
  BORRADOR: { label: 'Borrador', class: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  EN_PROCESO: { label: 'En proceso', class: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  PAGADA: { label: 'Pagada', class: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  CANCELADA: { label: 'Cancelada', class: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
}

export const periodLabels = {
  SEMANAL: 'Semanal',
  QUINCENAL: 'Quincenal',
  MENSUAL: 'Mensual',
}

export const contractTypeLabels = {
  BASE: 'Base',
  TEMPORAL: 'Temporal',
  HONORARIOS: 'Honorarios',
}

export const disabilityTypeLabels = {
  ENFERMEDAD_GENERAL: 'Enfermedad general',
  RIESGO_TRABAJO: 'Riesgo de trabajo',
  MATERNIDAD: 'Maternidad',
}

export const lockedStatuses = ['PAGADA', 'CANCELADA']

export function formatMoney(value) {
  if (value == null || value === '') return '$0.00'
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export function formatDate(value) {
  if (!value) return 'Sin registrar'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function formatShortDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' })
}
