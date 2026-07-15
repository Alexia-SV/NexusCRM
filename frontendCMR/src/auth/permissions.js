export const ROLES = {
  ADMIN: 'admin',
  LIDER: 'lider',
  OPERATIVO: 'operativo',
  CONTADOR: 'contador',
}

export function normalizeRole(role) {
  return String(role || '').toLowerCase()
}

export const permissions = {
  dashboard: Object.values(ROLES),
  usuariosRead: [ROLES.ADMIN, ROLES.LIDER],
  usuariosWrite: [ROLES.ADMIN],
  proyectosRead: [ROLES.ADMIN, ROLES.LIDER, ROLES.OPERATIVO],
  proyectosWrite: [ROLES.ADMIN, ROLES.LIDER],
  proveedoresRead: Object.values(ROLES),
  proveedoresWrite: [ROLES.ADMIN, ROLES.LIDER],
  insumosRead: Object.values(ROLES),
  insumosWrite: [ROLES.ADMIN, ROLES.LIDER, ROLES.OPERATIVO],
  nominasRead: Object.values(ROLES),
  nominasWrite: [ROLES.ADMIN, ROLES.CONTADOR],
  nominasConfig: [ROLES.ADMIN],
  reportesRead: Object.values(ROLES),
}

export function hasRole(user, allowedRoles) {
  return Boolean(user && allowedRoles.includes(normalizeRole(user.role)))
}
