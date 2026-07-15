import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permissions } from '../../auth/permissions'
import { useAuth } from '../../context/AuthContext'
import { createInventoryMovement, deactivateSupply, deleteSupply, listSupplies } from '../../services/supplies'
import { getApiError } from '../../services/api'

const statusConfig = {
  DISPONIBLE: { label: 'Disponible', className: 'bg-emerald-50 text-emerald-700' },
  STOCK_BAJO: { label: 'Stock bajo', className: 'bg-amber-50 text-amber-700' },
  AGOTADO: { label: 'Agotado', className: 'bg-rose-50 text-rose-700' },
  INACTIVO: { label: 'Inactivo', className: 'bg-slate-100 text-slate-500' },
}
const categoryLabels = { MATERIAL: 'Material', HERRAMIENTA: 'Herramienta', CONSUMIBLE: 'Consumible', EQUIPO: 'Equipo' }

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.INACTIVO
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>{config.label}</span>
}

function money(value) {
  if (value == null || value === '') return 'Sin precio'
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function Field({ label, value }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</dt><dd className="mt-1 text-sm text-slate-700 break-words">{value || 'Sin registrar'}</dd></div>
}

function MovementForm({ supply, onSaved, onCancel }) {
  const [type, setType] = useState('ENTRADA')
  const [quantity, setQuantity] = useState('')
  const [realUnitPrice, setRealUnitPrice] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError(''); setSaving(true)
    try {
      const updated = await createInventoryMovement(supply.id, { type, quantity: Number(quantity), realUnitPrice: realUnitPrice === '' ? undefined : Number(realUnitPrice), reason })
      onSaved(updated)
    } catch (requestError) { setError(getApiError(requestError, 'No fue posible registrar el movimiento.')) }
    finally { setSaving(false) }
  }
  return <form onSubmit={submit} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4"><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="AJUSTE">Ajuste</option></select><input value={quantity} onChange={(event) => setQuantity(event.target.value)} required min="0.001" step="0.001" type="number" placeholder="Cantidad" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><input value={realUnitPrice} onChange={(event) => setRealUnitPrice(event.target.value)} min="0" step="0.01" type="number" placeholder="Precio unitario" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
    {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    <div className="mt-4 flex gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">Cancelar</button><button disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400">{saving ? 'Guardando...' : 'Registrar movimiento'}</button></div>
  </form>
}

function SupplyModal({ supply, canWrite, onClose, onEdit, onDeactivate, onUpdated }) {
  const [movementOpen, setMovementOpen] = useState(false)
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6">
    <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start gap-3 border-b border-slate-100 p-4 sm:p-6"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">{supply.name?.[0]}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900 sm:text-xl">{supply.name}</h2><StatusBadge status={supply.status} /></div><p className="mt-1 text-sm text-slate-500">{supply.sku} - {categoryLabels[supply.category]}</p></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">x</button></header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <section><h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Catalogo de insumos</h3><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Descripcion" value={supply.description} /><Field label="Unidad" value={supply.unit} /><Field label="Precio ref." value={money(supply.referenceUnitPrice)} /><Field label="Stock actual" value={`${supply.currentStock} ${supply.unit}`} /><Field label="Stock minimo" value={supply.minimumStock} /><Field label="Stock maximo" value={supply.maximumStock} /><Field label="Proveedor preferido" value={supply.preferredProvider?.businessName} /></dl></section>
        <section className="border-t border-slate-100 pt-6"><div className="mb-4 flex items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Movimientos de inventario</h3>{canWrite && <button onClick={() => setMovementOpen(true)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">Nuevo movimiento</button>}</div>{movementOpen && <MovementForm supply={supply} onCancel={() => setMovementOpen(false)} onSaved={(updated) => { setMovementOpen(false); onUpdated(updated) }} />}{!supply.movements?.length ? <p className="text-sm text-slate-500">Sin movimientos registrados.</p> : <div className="space-y-3">{supply.movements.map((movement) => <article key={movement.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="text-sm font-semibold text-slate-800">{movement.type}</h4><p className="text-xs text-slate-500">{movement.reason || 'Sin motivo'} {movement.project ? `- ${movement.project.name}` : ''}</p></div><div className="text-sm text-slate-700 sm:text-right"><p>{movement.quantity} - stock final {movement.resultingStock}</p><p className="font-semibold">{money(movement.totalCost)}</p></div></div></article>)}</div>}</section>
      </div>
      <footer className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5"><div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">{canWrite && <button onClick={onEdit} className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">Editar</button>}{canWrite && supply.status !== 'INACTIVO' && <button onClick={onDeactivate} className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">Desactivar</button>}</div></footer>
    </div>
  </div>
}

export default function InsumosList() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canWrite = can(permissions.insumosWrite)
  const [supplies, setSupplies] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setSupplies(await listSupplies({ search: search || undefined, status: status || undefined })) }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible cargar insumos.')) }
    finally { setLoading(false) }
  }, [search, status])
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer) }, [load])
  const remove = async () => {
    try { await deleteSupply(deleteId); setDeleteId(null); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible eliminar. Si tiene historial, desactivalo.')) }
  }
  const deactivate = async (supply) => {
    try { const updated = await deactivateSupply(supply.id); setSelected(updated); await load() }
    catch (requestError) { setError(getApiError(requestError, 'No fue posible desactivar el insumo.')) }
  }
  return <div className="flex-1 overflow-y-auto p-4 md:p-8">
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-slate-900">Insumos</h1><p className="mt-1 text-sm text-slate-500">{supplies.length} registros encontrados</p></div>{canWrite && <button onClick={() => navigate('/insumos/nuevo')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">+ Nuevo insumo</button>}</div>
    {error && <div className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, SKU o descripcion..." className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"><option value="">Todos los estados</option><option value="DISPONIBLE">Disponible</option><option value="STOCK_BAJO">Stock bajo</option><option value="AGOTADO">Agotado</option><option value="INACTIVO">Inactivo</option></select></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{loading ? <p className="py-16 text-center text-sm text-slate-500">Cargando insumos...</p> : supplies.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No se encontraron insumos.</p> : <table className="w-full min-w-[860px]"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="px-6 py-3 text-left text-xs text-slate-500">Insumo</th><th className="px-4 py-3 text-left text-xs text-slate-500">SKU</th><th className="px-4 py-3 text-left text-xs text-slate-500">Categoria</th><th className="px-4 py-3 text-left text-xs text-slate-500">Stock</th><th className="px-4 py-3 text-left text-xs text-slate-500">Proveedor</th><th className="px-4 py-3 text-left text-xs text-slate-500">Estado</th><th className="px-6 py-3 text-right text-xs text-slate-500">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{supplies.map((supply) => <tr key={supply.id} className="hover:bg-slate-50"><td className="px-6 py-4"><button onClick={() => setSelected(supply)} className="text-left"><span className="block text-sm font-semibold text-slate-800">{supply.name}</span><span className="block text-xs text-slate-400">{supply.description || supply.unit}</span></button></td><td className="px-4 py-4 text-xs font-mono text-slate-500">{supply.sku}</td><td className="px-4 py-4 text-sm text-slate-600">{categoryLabels[supply.category]}</td><td className="px-4 py-4 text-sm text-slate-700">{supply.currentStock} {supply.unit}<p className="text-xs text-slate-400">min. {supply.minimumStock}</p></td><td className="px-4 py-4 text-sm text-slate-600">{supply.preferredProvider?.businessName || 'Sin proveedor'}</td><td className="px-4 py-4"><StatusBadge status={supply.status} /></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => setSelected(supply)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">Ver</button>{canWrite && <button onClick={() => navigate(`/insumos/editar/${supply.id}`)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Editar</button>}{can(permissions.usuariosWrite) && <button onClick={() => setDeleteId(supply.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Eliminar</button>}</div></td></tr>)}</tbody></table>}</div>
    {selected && <SupplyModal supply={selected} canWrite={canWrite} onClose={() => setSelected(null)} onEdit={() => navigate(`/insumos/editar/${selected.id}`)} onDeactivate={() => deactivate(selected)} onUpdated={(updated) => { setSelected(updated); void load() }} />}
    {deleteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-base font-bold text-slate-800">Eliminar insumo</h3><p className="mt-2 text-sm text-slate-500">Si tiene movimientos, el backend lo bloqueara y deberas desactivarlo.</p><div className="mt-6 flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600">Cancelar</button><button onClick={remove} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white">Eliminar</button></div></div></div>}
  </div>
}
