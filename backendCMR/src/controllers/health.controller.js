function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    app: 'Nexus CRM API',
    timestamp: new Date().toISOString(),
  })
}

module.exports = { getHealth }
