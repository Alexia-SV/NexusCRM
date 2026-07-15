import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { deactivateProvider, deleteProvider, listProviders } from '../../services/providers'
import { getApiError } from '../../services/api'

const statusConfig = {
  EVALUACION: { label: 'En evaluacion', className: 'bg-indigo-50 text-indigo-700' },
  ACTIVO: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700' },
  INACTIVO: { label: 'Inactivo', className: 'bg-slate-100 text-slate-500' },
  BLOQUEADO: { label: 'Bloqueado', className: 'bg-rose-50 text-rose-700' },
}

const categoryLabels = { MATERIALES: 'Materiales', SERVICIOS: 'Servicios', EQUIPO: 'Equipo', OTRO: 'Otro' }

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.INACTIVO
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>{config.label}</span>
}

function money(value, currency = 'MXN') {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency })
}

function initials(name) {
  return String(name || 'P').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function Field({ label, value }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

function ProviderModal({ provider, canWrite, onClose, onEdit, onDeactivate }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{initials(provider.businessName)}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900 sm:text-xl">{provider.businessName}</h2><StatusBadge status={provider.status} /></div><p className="mt-1 text-sm text-slate-500">{provider.rfc} - {categoryLabels[provider.category]}</p></div>
        <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">x</button>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Identificacion fiscal</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Tipo de persona" value={provider.personType === 'FISICA' ? 'Fisica' : 'Moral'} /><Field label="Regimen fiscal" value={provider.taxRegime} /><Field label="CURP" value={provider.curp || 'Solo persona fisica'} /><Field label="Giro / categoria" value={categoryLabels[provider.category]} /><Field label="Estado" value={statusConfig[provider.status]?.label} /><Field label="Calificacion" value={provider.rating ? `${provider.rating}/5` : 'Sin calificar'} /></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Contacto y ubicacion</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Contacto" value={provider.contactName} /><Field label="Puesto" value={provider.contactPosition} /><Field label="Telefono" value={provider.phone} /><Field label="Correo" value={provider.email} /><Field label="Sitio web" value={provider.website} /><Field label="Direccion" value={provider.address} /><Field label="Codigo postal" value={provider.postalCode} /><Field label="Ciudad / Estado" value={provider.cityState} /></dl></section>
        <section className="border-t border-slate-100 pt-6"><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Pago y control interno</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Banco" value={provider.bankName} /><Field label="CLABE" value={provider.clabe} /><Field label="Cuenta" value={provider.accountNumber} /><Field label="Moneda" value={provider.currency} /><Field label="Condiciones" value={provider.paymentTerms} /><Field label="Credito autorizado" value={provider.authorizedCredit ? money(provider.authorizedCredit, provider.currency) : ''} /><Field label="Compras historicas" value={money(provider.totalHistoricalPurchases, provider.currency)} /><Field label="Notas internas" value={provider.internalNotes} /></dl></section>
      </div>
      <footer className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5"><div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">{canWrite && <button onClick={onEdit} className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">Editar</button>}{canWrite && provider.status !== 'INACTIVO' && <button onClick={onDeactivate} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">Desactivar</button>}</div></footer>
    </div>
  </div>
}

export default function ProveedoresList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWrite = can(permissions.proveedoresWrite)
  const [providers, setProviders] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setProviders(await listProviders({ search: search || undefined, status: status || undefined })) }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible cargar proveedores.')) }
    finally { setLoading(false) }
  }, [search, status])

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])

  const deactivate = async (provider) => {
    try { const updated = await deactivateProvider(provider.id); setSelected(updated); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible desactivar el proveedor.')) }
  }

  const remove = async () => {
    try { await deleteProvider(deleteId); setDeleteId(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible eliminar. Si tiene historial, desactivalo.')) }
  }

  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-slate-900">Proveedores</h1><p className="mt-1 text-sm text-slate-500">{providers.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/proveedores/nuevo')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">+ Nuevo proveedor</button>}</div>
    {error && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar razon social, RFC, contacto o ciudad..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="">Todos los estados</option><option value="EVALUACION">En evaluacion</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option><option value="BLOQUEADO">Bloqueado</option></select></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando proveedores...</p> : providers.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron proveedores.</p> : <table className="w-full min-w-[920px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-6 py-3 text-left text-xs text-slate-500">Proveedor</th><th className="px-4 py-3 text-left text-xs text-slate-500">RFC</th><th className="px-4 py-3 text-left text-xs text-slate-500">Contacto</th><th className="px-4 py-3 text-left text-xs text-slate-500">Categoria</th><th className="px-4 py-3 text-left text-xs text-slate-500">Pago</th><th className="px-4 py-3 text-left text-xs text-slate-500">Estado</th><th className="px-6 py-3 text-right text-xs text-slate-500">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{providers.map((provider) => <tr key={provider.id} className="hover:bg-slate-50"><td className="px-6 py-4"><button onClick={() => setSelected(provider)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials(provider.businessName)}</span><span><span className="block text-sm font-semibold text-slate-800">{provider.businessName}</span><span className="block text-xs text-slate-400">{provider.email}</span></span></button></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{provider.rfc}</td><td className="px-4 py-4 text-sm text-slate-700">{provider.contactName}<p className="text-xs text-slate-400">{provider.phone}</p></td><td className="px-4 py-4 text-sm text-slate-600">{categoryLabels[provider.category]}</td><td className="px-4 py-4 text-sm text-slate-600">{provider.paymentTerms || 'Sin definir'}<p className="text-xs text-slate-400">{provider.currency}</p></td><td className="px-4 py-4"><StatusBadge status={provider.status} /></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelected(provider)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">Ver</button>{canWrite && <button onClick={() => navigate(`/proveedores/editar/${provider.id}`)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Editar</button>}{can(permissions.usuariosWrite) && <button onClick={() => setDeleteId(provider.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Eliminar</button>}</div></td></tr>)}</tbody></table>}</div>
    {selected && <ProviderModal provider={selected} canWrite={canWrite} onClose={() => setSelected(null)} onEdit={() => navigate(`/proveedores/editar/${selected.id}`)} onDeactivate={() => deactivate(selected)} />}
    {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-base font-bold text-slate-800">Eliminar proveedor</h3><p className="mt-2 text-sm text-slate-500">Si tiene historial, el backend lo bloqueara y deberas desactivarlo.</p><div className="mt-6 flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={remove} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white">Eliminar</button></div></div></div>}
  </div>
}
