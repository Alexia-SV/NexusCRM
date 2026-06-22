const employeeService = require('../services/employee.service')

async function list(req, res) { res.json({ employees: await employeeService.list(req.validated.query) }) }
async function get(req, res) { res.json({ employee: await employeeService.getById(req.validated.params.id) }) }
async function create(req, res) { res.status(201).json(await employeeService.create(req.validated.body)) }
async function update(req, res) { res.json(await employeeService.update(req.validated.params.id, req.validated.body)) }
async function deactivate(req, res) { res.json({ employee: await employeeService.deactivate(req.validated.params.id) }) }
async function remove(req, res) { await employeeService.remove(req.validated.params.id); res.status(204).send() }

module.exports = { list, get, create, update, deactivate, remove }
