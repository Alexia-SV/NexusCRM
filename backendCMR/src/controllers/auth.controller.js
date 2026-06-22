const authService = require('../services/auth.service')
const {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookie,
} = require('../utils/cookies')

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions())
}

async function login(req, res) {
  const result = await authService.login({
    ...req.validated.body,
    metadata: authService.sessionMetadata(req),
  })

  setRefreshCookie(res, result.refreshToken)
  res.status(200).json({
    message: 'Login successful',
    accessToken: result.accessToken,
    user: result.user,
  })
}

async function refresh(req, res) {
  const result = await authService.refreshSession(
    req.cookies[REFRESH_COOKIE_NAME],
    authService.sessionMetadata(req),
  )

  setRefreshCookie(res, result.refreshToken)
  res.status(200).json({
    accessToken: result.accessToken,
    user: result.user,
  })
}

async function logout(req, res) {
  await authService.logout(req.cookies[REFRESH_COOKIE_NAME])
  clearRefreshCookie(res)
  res.status(204).send()
}

async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.validated.body.email)

  res.status(200).json({
    message: 'If the account exists, password reset instructions were generated.',
    ...result,
  })
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.validated.body)
  clearRefreshCookie(res)
  res.status(200).json({ message: 'Password reset successfully' })
}

async function changePassword(req, res) {
  await authService.changePassword({
    userId: req.user.id,
    ...req.validated.body,
  })
  clearRefreshCookie(res)
  res.status(200).json({ message: 'Password changed successfully. Please log in again.' })
}

function me(req, res) {
  res.status(200).json({ user: req.user })
}

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
}
