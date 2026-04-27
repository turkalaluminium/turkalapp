import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

function formatKg(v) {
  return `${Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg`
}

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('tr-TR')
}

export default function PrestekiSiparisGirisi() {
  const navigate = useNavigate()
  const [kg, setKg] = useState('')
  const [mevcutKg, setMevcutKg] = useState(0)
  const [guncellenme, setGuncellenme] = useState('')
  const [loading, setLoading] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')

  async function yukle() {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/press-order-kg'))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const currentKg = Number(data?.item?.kg || 0)
      setMevcutKg(Number.isFinite(currentKg) ? Math.max(0, currentKg) : 0)
      setGuncellenme(String(data?.item?.guncellenme || ''))
      setHata('')
    } catch (err) {
      setHata(err.message || 'Presteki siparis kg alinamadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    yukle()
  }, [])

  async function kaydet() {
    const value = Number(kg)
    if (!Number.isFinite(value) || value < 0) {
      setHata('Presteki siparis kg 0 veya buyuk olmali')
      setMesaj('')
      return
    }
    try {
      setKaydediliyor(true)
      setHata('')
      setMesaj('')
      const res = await fetch(apiUrl('/api/press-order-kg'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kg: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setMesaj('Presteki siparis kg kaydedildi')
      setKg('')
      yukle()
    } catch (err) {
      setHata(err.message || 'Presteki siparis kg kaydedilemedi')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-gray-100">
        <button onClick={() => navigate('/menu')} className="p-1 -ml-1">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img src="/turkal-logo.png" alt="Turkal" className="h-9 w-auto object-contain" draggable={false} />
        <div>
          <h1 className="font-semibold text-gray-800 text-sm">Henuz Preste Basilmamis Siparis Kg Girisi</h1>
          <p className="text-xs text-gray-400">Operator giris ekrani</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        <div className="rounded-xl border border-sky-100 p-3 bg-sky-50">
          <p className="text-[11px] text-sky-600">Kayitli henuz preste basilmamis siparis kg</p>
          <p className="text-base font-semibold text-sky-700">{formatKg(mevcutKg)}</p>
          <p className="text-[11px] text-sky-500 mt-1">Son guncelleme: {formatDateTime(guncellenme)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-3 bg-white space-y-2">
          <label className="block text-xs font-medium text-gray-500">Henuz preste basilmamis siparis kg</label>
          <input
            type="number"
            min="0"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="Orn: 45000"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
          <button
            onClick={kaydet}
            disabled={kaydediliyor}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 shadow-sm"
            style={{ backgroundColor: '#CC2B1D' }}
          >
            {kaydediliyor ? 'Kaydediliyor...' : 'Henuz Preste Basilmamis Siparis Kg Kaydet'}
          </button>
        </div>

        {loading && <p className="text-xs text-gray-400">Kayitli deger yukleniyor...</p>}
        {hata && <p className="text-xs text-red-500">{hata}</p>}
        {mesaj && <p className="text-xs text-green-600">{mesaj}</p>}
      </div>
    </div>
  )
}
