const service = require('../services/supply.service')

async function list(req, res) { res.json({ supplies: await service.list(req.validated.query) }) }
async function get(req, res) { res.json({ supply: await service.getById(req.validated.params.id) }) }
async function create(req, res) { res.status(201).json({ supply: await service.create(req.validated.body) }) }
async function update(req, res) { res.json({ supply: await service.update(req.validated.params.id, req.validated.body) }) }
async function movement(req, res) { res.status(201).json({ supply: await service.createMovement(req.validated.params.id, req.validated.body, req.user) }) }
async function deactivate(req, res) { res.json({ supply: await service.deactivate(req.validated.params.id) }) }
async function remove(req, res) { await service.remove(req.validated.params.id); res.status(204).send() }

module.exports = { list, get, create, update, movement, deactivate, remove }
