const { Router } = require('express')
const authController = require('../controllers/auth.controller')
const { asyncHandler } = require('../utils/asyncHandler')
const { validate } = require('../middlewares/validate')
const { authRequired } = require('../middlewares/auth')
const { authRateLimit, passwordResetRateLimit } = require('../middlewares/authRateLimit')
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/auth.validators')

const router = Router()

router.post('/login', authRateLimit, validate(loginSchema), asyncHandler(authController.login))
router.post('/refresh', authRateLimit, asyncHandler(authController.refresh))
router.post('/logout', asyncHandler(authController.logout))
router.post(
  '/forgot-password',
  passwordResetRateLimit,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
)
router.post(
  '/reset-password',
  passwordResetRateLimit,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
)
router.post(
  '/change-password',
  authRequired,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
)
router.get('/me', authRequired, authController.me)

module.exports = router
