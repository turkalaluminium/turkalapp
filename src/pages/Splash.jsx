import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthSession } from '../utils/auth'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      const session = getAuthSession()
      navigate(session ? '/menu' : '/giris')
    }, 1200)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-white">
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <img
          src="/turkal-logo.png"
          alt="Turkal Aluminium"
          className="w-64 h-auto object-contain"
          draggable={false}
        />
      </div>

      {/* Loading bar */}
      <div className="w-48 h-0.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full loading-bar"
          style={{ backgroundColor: '#CC2B1D' }}
        />
      </div>
    </div>
  )
}
