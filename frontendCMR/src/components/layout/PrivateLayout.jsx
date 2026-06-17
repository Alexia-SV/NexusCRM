import Sidebar from './Sidebar'

export default function PrivateLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      {/* pb-20 en móvil para dejar espacio a la bottom nav */}
      <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}