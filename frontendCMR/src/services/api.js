import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

let accessToken = null
let refreshPromise = null
let sessionExpiredHandler = null

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export function setAccessToken(token) {
  accessToken = token || null
}

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler
}

export function getApiError(error, fallback = 'Ocurrió un error. Intenta de nuevo.') {
  return error.response?.data?.message || fallback
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh', null, { skipAuthRefresh: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return data
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function restoreSession() {
  return refreshAccessToken()
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const canRefresh = error.response?.status === 401
      && original
      && !original._retry
      && !original.skipAuthRefresh
      && !original.url?.includes('/auth/login')

    if (!canRefresh) return Promise.reject(error)

    original._retry = true
    try {
      await refreshAccessToken()
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch (refreshError) {
      setAccessToken(null)
      sessionExpiredHandler?.()
      return Promise.reject(refreshError)
    }
  },
)
