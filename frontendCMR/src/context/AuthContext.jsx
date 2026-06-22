/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, onSessionExpired, restoreSession, setAccessToken } from '../services/api'
import { hasRole } from '../auth/permissions'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    onSessionExpired(clearSession)
    restoreSession()
      .then((data) => {
        setUser(data.user)
        setStatus('authenticated')
      })
      .catch(clearSession)
    return () => onSessionExpired(null)
  }, [clearSession])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials, { skipAuthRefresh: true })
    setAccessToken(data.accessToken)
    setUser(data.user)
    setStatus('authenticated')
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', null, { skipAuthRefresh: true })
    } finally {
      clearSession()
    }
  }, [clearSession])

  const changePassword = useCallback(async (passwords) => {
    await api.post('/auth/change-password', passwords)
    clearSession()
  }, [clearSession])

  const can = useCallback((roles) => hasRole(user, roles), [user])
  const value = useMemo(() => ({
    user,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    logout,
    changePassword,
    can,
  }), [user, status, login, logout, changePassword, can])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
