function validate(schema) {
  return function validationMiddleware(req, res, next) {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    })

    if (!result.success) {
      return res.status(422).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'),
          message: issue.message,
        })),
      })
    }

    req.validated = result.data
    return next()
  }
}

module.exports = { validate }
