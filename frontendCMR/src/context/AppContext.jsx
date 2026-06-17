import { createContext, useContext, useState } from 'react'
import { usuariosMock, proyectosMock, proveedoresMock } from '../data/mockData'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [usuarios,    setUsuarios]    = useState(usuariosMock)
  const [proyectos,   setProyectos]   = useState(proyectosMock)
  const [proveedores, setProveedores] = useState(proveedoresMock)

  // ── USUARIOS ──────────────────────────────────
  const crearUsuario   = (data) => setUsuarios((prev) => [...prev, { ...data, id: Date.now(), salario: Number(data.salario) }])
  const editarUsuario  = (id, data) => setUsuarios((prev) => prev.map((u) => u.id === Number(id) ? { ...u, ...data, salario: Number(data.salario) } : u))
  const eliminarUsuario = (id) => setUsuarios((prev) => prev.filter((u) => u.id !== Number(id)))

  // ── PROYECTOS ─────────────────────────────────
  const crearProyecto   = (data, involucrados) => setProyectos((prev) => [...prev, { ...data, id: Date.now(), involucrados }])
  const editarProyecto  = (id, data, involucrados) => setProyectos((prev) => prev.map((p) => p.id === Number(id) ? { ...p, ...data, involucrados } : p))
  const eliminarProyecto = (id) => setProyectos((prev) => prev.filter((p) => p.id !== Number(id)))

  // ── PROVEEDORES/CLIENTES ───────────────────────
  const crearProveedor   = (data) => setProveedores((prev) => [...prev, { ...data, id: Date.now() }])
  const editarProveedor  = (id, data) => setProveedores((prev) => prev.map((p) => p.id === Number(id) ? { ...p, ...data } : p))
  const eliminarProveedor = (id) => setProveedores((prev) => prev.filter((p) => p.id !== Number(id)))

  // ── STATS ─────────────────────────────────────
  const stats = {
    empleadosActivos:   usuarios.filter((u) => u.status === 'activo').length,
    proyectosActivos:   proyectos.filter((p) => p.status === 'activo').length,
    proveedoresActivos: proveedores.filter((p) => p.tipo === 'proveedor' && p.status === 'activo').length,
    clientesActivos:    proveedores.filter((p) => p.tipo === 'cliente' && p.status === 'activo').length,
    totalNominasMes:    usuarios.filter((u) => u.status === 'activo').reduce((acc, u) => acc + Number(u.salario), 0),
  }

  return (
    <AppContext.Provider value={{
      usuarios, crearUsuario, editarUsuario, eliminarUsuario,
      proyectos, crearProyecto, editarProyecto, eliminarProyecto,
      proveedores, crearProveedor, editarProveedor, eliminarProveedor,
      stats,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}