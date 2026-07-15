import { api } from './api'

export async function listProviders(filters = {}) {
  const { data } = await api.get('/providers', { params: filters })
  return data.providers
}

export async function getProvider(id) {
  const { data } = await api.get(`/providers/${id}`)
  return data.provider
}

export async function createProvider(payload) {
  const { data } = await api.post('/providers', payload)
  return data.provider
}

export async function updateProvider(id, payload) {
  const { data } = await api.put(`/providers/${id}`, payload)
  return data.provider
}

export async function deactivateProvider(id) {
  const { data } = await api.patch(`/providers/${id}/deactivate`)
  return data.provider
}

export async function deleteProvider(id) {
  await api.delete(`/providers/${id}`)
}
