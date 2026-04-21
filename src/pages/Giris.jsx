import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithCredentials } from '../utils/auth'

export default function Giris() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hata, setHata] = useState('')

  function handleLogin() {
    const result = loginWithCredentials(username, password)
    if (!result.ok) {
      setHata(result.error)
      return
    }
    setHata('')
    navigate('/menu', { replace: true })
  }

  return (
    <div className="flex flex-col justify-center min-h-screen bg-white px-5 safe-top safe-bottom">
      <div className="mb-7">
        <img
          src="/turkal-logo.png"
          alt="Turkal Aluminium"
          className="w-52 h-auto object-contain mb-3"
          draggable={false}
        />
        <p className="text-sm text-gray-400 mt-1">Kullanici adi ve sifre ile giris yapin.</p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Kullanici adi (patron / operator / satis)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Sifre"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
        />
      </div>

      {hata && <p className="text-xs text-red-500 mt-3">{hata}</p>}

      <button
        onClick={handleLogin}
        className="w-full mt-4 py-3.5 rounded-xl text-white text-sm font-semibold"
        style={{ backgroundColor: '#CC2B1D' }}
      >
        Giris Yap
      </button>

      <div className="mt-5 text-xs text-gray-400 space-y-1">
        <p>Demo kullanicilar: patron / operator / satis</p>
        <p>Demo sifre: turkal123</p>
      </div>
    </div>
  )
}
