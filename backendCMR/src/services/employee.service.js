const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { prisma } = require('../config/prisma')
const { AppError } = require('../utils/AppError')

const includeUser = { user: { select: { id: true, email: true, role: true, active: true, mustChangePassword: true } } }

function serialize(employee) {
  return {
    ...employee,
    dailySalary: Number(employee.dailySalary),
    integratedImssSalary: employee.integratedImssSalary == null ? null : Number(employee.integratedImssSalary),
  }
}

function generatedPassword() {
  return `Nx!${crypto.randomBytes(12).toString('base64url')}9aA`
}

function employeeData(input) {
  const { systemUser: _systemUser, ...data } = input
  return {
    ...data,
    birthDate: new Date(`${data.birthDate}T00:00:00.000Z`),
    hireDate: new Date(`${data.hireDate}T00:00:00.000Z`),
  }
}

function userEmail(input) {
  return input.systemUser?.email || input.institutionalEmail || input.personalEmail
}

function throwKnownError(error) {
  if (error.code === 'P2002') {
    const field = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'unique field'
    throw new AppError(`A record already exists with this ${field}`, 409, 'DUPLICATE_VALUE')
  }
  throw error
}

async function list(filters) {
  const where = {
    ...(filters.active && { active: filters.active === 'true' }),
    ...(filters.department && { department: { equals: filters.department, mode: 'insensitive' } }),
    ...(filters.position && { position: { equals: filters.position, mode: 'insensitive' } }),
    ...(filters.search && { OR: [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { paternalLastName: { contains: filters.search, mode: 'insensitive' } },
      { maternalLastName: { contains: filters.search, mode: 'insensitive' } },
      { curp: { contains: filters.search, mode: 'insensitive' } },
      { position: { contains: filters.search, mode: 'insensitive' } },
      { department: { contains: filters.search, mode: 'insensitive' } },
    ] }),
  }
  const employees = await prisma.employee.findMany({ where, include: includeUser, orderBy: [{ active: 'desc' }, { firstName: 'asc' }] })
  return employees.map(serialize)
}

async function getById(id) {
  const employee = await prisma.employee.findUnique({ where: { id }, include: includeUser })
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
  return serialize(employee)
}

async function create(input) {
  let temporaryPassword
  try {
    const employee = await prisma.$transaction(async (tx) => {
      let user
      if (input.systemUser?.enabled) {
        temporaryPassword = input.systemUser.passwordMode === 'manual' ? input.systemUser.password : generatedPassword()
        user = await tx.user.create({ data: {
          fullName: [input.firstName, input.paternalLastName, input.maternalLastName].filter(Boolean).join(' '),
          email: userEmail(input), role: input.systemUser.role,
          passwordHash: await bcrypt.hash(temporaryPassword, 12), active: input.active, mustChangePassword: true,
        } })
      }
      return tx.employee.create({ data: { ...employeeData(input), userId: user?.id }, include: includeUser })
    })
    return { employee: serialize(employee), ...(input.systemUser?.enabled && input.systemUser.passwordMode !== 'manual' ? { temporaryPassword } : {}) }
  } catch (error) { throwKnownError(error) }
}

async function update(id, input) {
  let temporaryPassword
  try {
    const employee = await prisma.$transaction(async (tx) => {
      const current = await tx.employee.findUnique({ where: { id }, include: { user: true } })
      if (!current) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
      let userId = current.userId
      if (input.systemUser?.enabled) {
        if (current.user) {
          await tx.user.update({ where: { id: current.user.id }, data: {
            fullName: [input.firstName, input.paternalLastName, input.maternalLastName].filter(Boolean).join(' '),
            email: userEmail(input), role: input.systemUser.role, active: input.active,
          } })
        } else {
          const password = input.systemUser.passwordMode === 'manual' ? input.systemUser.password : generatedPassword()
          if (input.systemUser.passwordMode !== 'manual') temporaryPassword = password
          const user = await tx.user.create({ data: {
            fullName: [input.firstName, input.paternalLastName, input.maternalLastName].filter(Boolean).join(' '),
            email: userEmail(input), role: input.systemUser.role,
            passwordHash: await bcrypt.hash(password, 12), active: input.active, mustChangePassword: true,
          } })
          userId = user.id
        }
      } else if (current.user) {
        await tx.user.update({ where: { id: current.user.id }, data: { active: false } })
      }
      if (!input.active && current.userId) {
        await tx.user.update({ where: { id: current.userId }, data: { active: false } })
        await tx.refreshToken.updateMany({ where: { userId: current.userId, revokedAt: null }, data: { revokedAt: new Date() } })
      }
      return tx.employee.update({ where: { id }, data: { ...employeeData(input), userId }, include: includeUser })
    })
    return { employee: serialize(employee), ...(temporaryPassword ? { temporaryPassword } : {}) }
  } catch (error) { throwKnownError(error) }
}

async function deactivate(id) {
  const current = await prisma.employee.findUnique({ where: { id } })
  if (!current) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
  const operations = [prisma.employee.update({ where: { id }, data: { active: false }, include: includeUser })]
  if (current.userId) {
    operations.push(prisma.user.update({ where: { id: current.userId }, data: { active: false } }))
    operations.push(prisma.refreshToken.updateMany({ where: { userId: current.userId, revokedAt: null }, data: { revokedAt: new Date() } }))
  }
  const [employee] = await prisma.$transaction(operations)
  return serialize(employee)
}

async function remove(id) {
  const current = await prisma.employee.findUnique({ where: { id } })
  if (!current) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND')
  await prisma.$transaction(async (tx) => {
    await tx.employee.delete({ where: { id } })
    if (current.userId) await tx.user.delete({ where: { id: current.userId } })
  })
}

module.exports = { list, getById, create, update, deactivate, remove }
