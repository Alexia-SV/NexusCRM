import { api } from './api'

export async function listEmployees(filters = {}) {
  const { data } = await api.get('/employees', { params: filters })
  return data.employees
}

export async function getEmployee(id) {
  const { data } = await api.get(`/employees/${id}`)
  return data.employee
}

export async function createEmployee(payload) {
  const { data } = await api.post('/employees', payload)
  return data
}

export async function updateEmployee(id, payload) {
  const { data } = await api.put(`/employees/${id}`, payload)
  return data
}

export async function deactivateEmployee(id) {
  const { data } = await api.patch(`/employees/${id}/deactivate`)
  return data.employee
}

export async function deleteEmployee(id) {
  await api.delete(`/employees/${id}`)
}
