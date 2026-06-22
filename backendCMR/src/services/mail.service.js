const nodemailer = require('nodemailer')
const { env } = require('../config/env')

function isMailConfigured() {
  return Boolean(
    env.smtp.host
    && env.smtp.host !== 'smtp.example.com'
    && env.smtp.user
    && env.smtp.pass
    && env.smtp.pass !== 'change_me',
  )
}

async function sendPasswordResetEmail({ email, resetUrl }) {
  if (!isMailConfigured()) {
    if (env.nodeEnv === 'development') {
      console.log(`Password reset URL for ${email}: ${resetUrl}`)
    }
    return false
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  })

  await transporter.sendMail({
    from: env.smtp.from,
    to: email,
    subject: 'Restablece tu contraseña de Nexus CRM',
    text: `Usa este enlace para restablecer tu contraseña: ${resetUrl}\n\nEl enlace expira en ${env.passwordResetExpiresMinutes} minutos y solo puede utilizarse una vez.`,
    html: `<p>Usa el siguiente enlace para restablecer tu contraseña de Nexus CRM:</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace expira en ${env.passwordResetExpiresMinutes} minutos y solo puede utilizarse una vez.</p>`,
  })

  return true
}

module.exports = { sendPasswordResetEmail, isMailConfigured }
