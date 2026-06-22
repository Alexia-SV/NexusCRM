const { prisma } = require('../config/prisma')
const { verifyAccessToken } = require('../utils/tokens')
const { AppError } = require('../utils/AppError')

async function authRequired(req, _res, next) {
  try {
    const authorization = req.get('authorization')

    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
    }

    const payload = verifyAccessToken(authorization.slice(7))
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
      },
    })

    if (!user?.active) {
      throw new AppError('Invalid or inactive session', 401, 'INVALID_SESSION')
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof AppError) return next(error)
    return next(new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'))
  }
}

function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission for this action', 403, 'FORBIDDEN'))
    }

    return next()
  }
}

module.exports = { authRequired, requireRole }
