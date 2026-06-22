const { z } = require('zod')

const passwordSchema = z.string()
  .min(10, 'Password must contain at least 10 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character')

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  }),
})

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(32).max(256),
    newPassword: passwordSchema,
  }),
})

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  }).refine(
    ({ currentPassword, newPassword }) => currentPassword !== newPassword,
    { message: 'New password must be different', path: ['newPassword'] },
  ),
})

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
}
