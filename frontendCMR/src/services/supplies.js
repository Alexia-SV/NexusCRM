import { api } from './api'

export async function listSupplies(filters = {}) {
  const { data } = await api.get('/supplies', { params: filters })
  return data.supplies
}

export async function getSupply(id) {
  const { data } = await api.get(`/supplies/${id}`)
  return data.supply
}

export async function createSupply(payload) {
  const { data } = await api.post('/supplies', payload)
  return data.supply
}

export async function updateSupply(id, payload) {
  const { data } = await api.put(`/supplies/${id}`, payload)
  return data.supply
}

export async function createInventoryMovement(id, payload) {
  const { data } = await api.post(`/supplies/${id}/movements`, payload)
  return data.supply
}

export async function deactivateSupply(id) {
  const { data } = await api.patch(`/supplies/${id}/deactivate`)
  return data.supply
}

export async function deleteSupply(id) {
  await api.delete(`/supplies/${id}`)
}
