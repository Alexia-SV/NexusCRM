const payrollService = require('../services/payroll.service')
const configService = require('../services/payrollConfig.service')

// Cabeceras de nomina
async function list(req, res) { res.json({ payrolls: await payrollService.list(req.validated.query) }) }
async function get(req, res) { res.json({ payroll: await payrollService.getById(req.validated.params.id) }) }
async function create(req, res) { res.status(201).json({ payroll: await payrollService.create(req.validated.body, req.user) }) }
async function update(req, res) { res.json({ payroll: await payrollService.update(req.validated.params.id, req.validated.body) }) }
async function changeStatus(req, res) { res.json({ payroll: await payrollService.changeStatus(req.validated.params.id, req.validated.body.status) }) }
async function remove(req, res) { await payrollService.remove(req.validated.params.id); res.status(204).send() }

// Recibos
async function generate(req, res) { res.status(201).json({ payroll: await payrollService.generateReceipts(req.validated.params.id, req.validated.body) }) }
async function updateReceipt(req, res) { res.json({ payroll: await payrollService.updateReceipt(req.validated.params.id, req.validated.params.receiptId, req.validated.body) }) }
async function removeReceipt(req, res) { res.json({ payroll: await payrollService.removeReceipt(req.validated.params.id, req.validated.params.receiptId) }) }
async function getReceipt(req, res) { res.json({ receipt: await payrollService.getReceipt(req.validated.params.receiptId) }) }

// Configuracion
async function getConfig(_req, res) { res.json(await configService.getConfig()) }
async function updateConfig(req, res) { res.json({ config: await configService.updateConfig(req.validated.body) }) }

module.exports = {
  list, get, create, update, changeStatus, remove,
  generate, updateReceipt, removeReceipt, getReceipt,
  getConfig, updateConfig,
}
