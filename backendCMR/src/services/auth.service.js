const bcrypt = require('bcryptjs')
const { prisma } = require('../config/prisma')
const { env } = require('../config/env')
const { AppError } = require('../utils/AppError')
const {
  signAccessToken,
  createOpaqueToken,
  hashToken,
  refreshTokenExpiry,
} = require('../utils/tokens')
const { sendPasswordResetEmail, isMailConfigured } = require('./mail.service')

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('nexus-crm-invalid-user', 12)

const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  active: true,
  mustChangePassword: true,
  lastAccessAt: true,
}

function sessionMetadata(req) {
  return {
    ipAddress: req.ip?.slice(0, 45),
    userAgent: req.get('user-agent')?.slice(0, 500),
  }
}

async function createSession(user, metadata) {
  const accessToken = signAccessToken(user)
  const refreshToken = createOpaqueToken()

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
      ...metadata,
    },
  })

  return { accessToken, refreshToken }
}

async function registerFailedLogin(user) {
  const attempts = user.failedLoginAttempts + 1
  const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: shouldLock ? 0 : attempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
    },
  })

  if (shouldLock) {
    throw new AppError('Account locked for 15 minutes', 423, 'ACCOUNT_LOCKED')
  }

  throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
}

async function login({ email, password, metadata }) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  if (!user.active) {
    throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE')
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError('Account is temporarily locked', 423, 'ACCOUNT_LOCKED')
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash)
  if (!validPassword) await registerFailedLogin(user)

  const now = new Date()
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastAccessAt: now,
    },
    select: publicUserSelect,
  })

  const session = await createSession(updatedUser, metadata)
  return { user: updatedUser, ...session }
}

async function refreshSession(rawToken, metadata) {
  if (!rawToken) {
    throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED')
  }

  const tokenHash = hashToken(rawToken)
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }

  if (storedToken.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    throw new AppError('Refresh token reuse detected', 401, 'REFRESH_TOKEN_REUSED')
  }

  if (storedToken.expiresAt <= new Date() || !storedToken.user.active) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    })
    throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED')
  }

  const newRefreshToken = createOpaqueToken()
  const accessToken = signAccessToken(storedToken.user)
  const now = new Date()

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: now },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: storedToken.userId,
        expiresAt: refreshTokenExpiry(),
        ...metadata,
      },
    }),
  ])

  const user = await prisma.user.findUnique({
    where: { id: storedToken.userId },
    select: publicUserSelect,
  })

  return { user, accessToken, refreshToken: newRefreshToken }
}

async function logout(rawToken) {
  if (!rawToken) return

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.active) return {}

  const rawToken = createOpaqueToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + env.passwordResetExpiresMinutes * 60 * 1000)

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    }),
  ])

  const resetUrl = `${env.frontendUrl}/restablecer-contrasena?token=${encodeURIComponent(rawToken)}`
  const delivered = await sendPasswordResetEmail({ email: user.email, resetUrl })

  return {
    ...(env.nodeEnv === 'development' && !isMailConfigured() ? { developmentResetToken: rawToken } : {}),
    delivered,
  }
}

async function resetPassword({ token, newPassword }) {
  const storedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!storedToken || storedToken.usedAt || storedToken.expiresAt <= new Date()) {
    throw new AppError('Reset token is invalid or expired', 400, 'INVALID_RESET_TOKEN')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const now = new Date()

  await prisma.$transaction([
    prisma.user.update({
      where: { id: storedToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { usedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ])
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const validPassword = user && await bcrypt.compare(currentPassword, user.passwordHash)

  if (!validPassword) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD')
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const now = new Date()

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ])
}

module.exports = {
  sessionMetadata,
  login,
  refreshSession,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
}
