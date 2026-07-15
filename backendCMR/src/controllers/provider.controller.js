const service = require('../services/provider.service')

async function list(req, res) { res.json({ providers: await service.list(req.validated.query) }) }
async function get(req, res) { res.json({ provider: await service.getById(req.validated.params.id) }) }
async function create(req, res) { res.status(201).json({ provider: await service.create(req.validated.body, req.user) }) }
async function update(req, res) { res.json({ provider: await service.update(req.validated.params.id, req.validated.body) }) }
async function deactivate(req, res) { res.json({ provider: await service.deactivate(req.validated.params.id) }) }
async function remove(req, res) { await service.remove(req.validated.params.id); res.status(204).send() }

module.exports = { list, get, create, update, deactivate, remove }
