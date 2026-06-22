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
}

export function hasRole(user, allowedRoles) {
  return Boolean(user && allowedRoles.includes(normalizeRole(user.role)))
}
