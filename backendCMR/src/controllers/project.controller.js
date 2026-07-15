const service = require('../services/project.service')

async function list(req, res) { res.json({ projects: await service.list(req.validated.query) }) }
async function get(req, res) { res.json({ project: await service.getById(req.validated.params.id) }) }
async function create(req, res) { res.status(201).json({ project: await service.create(req.validated.body, req.user) }) }
async function update(req, res) { res.json({ project: await service.update(req.validated.params.id, req.validated.body) }) }
async function remove(req, res) { await service.remove(req.validated.params.id); res.status(204).send() }

module.exports = { list, get, create, update, remove }
