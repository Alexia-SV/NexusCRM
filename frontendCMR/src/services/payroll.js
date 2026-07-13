import { api } from './api'

// ── Cabeceras de nómina ──────────────────────────────
export async function listPayrolls(filters = {}) {
  const { data } = await api.get('/payroll', { params: filters })
  return data.payrolls
}

export async function getPayroll(id) {
  const { data } = await api.get(`/payroll/${id}`)
  return data.payroll
}

export async function createPayroll(payload) {
  const { data } = await api.post('/payroll', payload)
  return data.payroll
}

export async function updatePayroll(id, payload) {
  const { data } = await api.put(`/payroll/${id}`, payload)
  return data.payroll
}

export async function changePayrollStatus(id, status) {
  const { data } = await api.patch(`/payroll/${id}/status`, { status })
  return data.payroll
}

export async function deletePayroll(id) {
  await api.delete(`/payroll/${id}`)
}

// ── Recibos ──────────────────────────────────────────
export async function generateReceipts(payrollId, employeeIds) {
  const { data } = await api.post(`/payroll/${payrollId}/receipts/generate`, employeeIds ? { employeeIds } : {})
  return data.payroll
}

export async function updateReceipt(payrollId, receiptId, payload) {
  const { data } = await api.put(`/payroll/${payrollId}/receipts/${receiptId}`, payload)
  return data.payroll
}

export async function deleteReceipt(payrollId, receiptId) {
  const { data } = await api.delete(`/payroll/${payrollId}/receipts/${receiptId}`)
  return data.payroll
}

export async function getReceipt(receiptId) {
  const { data } = await api.get(`/payroll/receipts/${receiptId}`)
  return data.receipt
}

// ── Reportes ─────────────────────────────────────────
export async function getPayrollReport(params = {}) {
  const { data } = await api.get('/payroll/report', { params })
  return data
}

// ── Configuración ────────────────────────────────────
export async function getPayrollConfig() {
  const { data } = await api.get('/payroll/config')
  return data
}

export async function updatePayrollConfig(payload) {
  const { data } = await api.put('/payroll/config', payload)
  return data.config
}
