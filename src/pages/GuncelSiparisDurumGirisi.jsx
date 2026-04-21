import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

const DAY_MS = 24 * 60 * 60 * 1000

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

const INITIAL_FORM = {
  id: '',
  ulke: '',
  firma: '',
  siparisAdi: '',
  siparisKg: '',
  ilerlemeYuzde: '',
  gelisTarihi: bugun(),
  terminTarihi: '',
  tamamlanmaTarihi: '',
  sevkEdildi: false,
  durumNotu: '',
}

export default function GuncelSiparisDurumGirisi() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')

  function terminGunFarki(dateStr) {
    if (!dateStr) return null
    const target = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(target.getTime())) return null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    return Math.round((target - now) / DAY_MS)
  }

  async function yukle() {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/current-orders'))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setItems(Array.isArray(data.items) ? data.items : [])
      setHata('')
    } catch (err) {
      setHata(err.message || 'Siparisler alinamadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    yukle()
  }, [])

  const alfabetikItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aKey = `${a.ulke || ''} ${a.firma || ''} ${a.siparisAdi || ''}`.trim()
      const bKey = `${b.ulke || ''} ${b.firma || ''} ${b.siparisAdi || ''}`.trim()
      return aKey.localeCompare(bKey, 'tr', { sensitivity: 'base' })
    })
  }, [items])

  function seciliYukle(item) {
    setForm({
      id: item.id || '',
      ulke: item.ulke || '',
      firma: item.firma || '',
      siparisAdi: item.siparisAdi || '',
      siparisKg: String(item.siparisKg ?? ''),
      ilerlemeYuzde: String(item.ilerlemeYuzde ?? ''),
      gelisTarihi: item.gelisTarihi || bugun(),
      terminTarihi: item.terminTarihi || '',
      tamamlanmaTarihi: item.tamamlanmaTarihi || '',
      sevkEdildi: Boolean(item.sevkEdildi),
      durumNotu: item.durumNotu || '',
    })
    setMesaj('')
    setHata('')
  }

  function yeniSiparisModu() {
    setForm(INITIAL_FORM)
    setMesaj('')
    setHata('')
  }

  async function kaydet() {
    const pct = Number(form.ilerlemeYuzde)
    const kg = Number(form.siparisKg)
    if (!form.ulke || !form.firma || !form.siparisAdi) {
      return setHata('Ulke, firma ve siparis adi zorunlu')
    }
    if (!Number.isFinite(kg) || kg < 0) {
      return setHata('Siparis kg 0 veya buyuk olmali')
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return setHata('Ilerleme yuzdesi 0-100 arasinda olmali')
    }

    try {
      setKaydediliyor(true)
      setHata('')
      setMesaj('')
      const payload = {
        ...form,
        siparisKg: kg,
        ilerlemeYuzde: pct,
        sevkEdildi: pct >= 100 ? Boolean(form.sevkEdildi) : false,
        tamamlanmaTarihi: pct >= 100 ? (form.tamamlanmaTarihi || bugun()) : form.tamamlanmaTarihi,
      }
      const res = await fetch(apiUrl('/api/current-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setMesaj('Siparis durumu kaydedildi')
      setForm(INITIAL_FORM)
      yukle()
    } catch (err) {
      setHata(err.message || 'Siparis kaydedilemedi')
    } finally {
      setKaydediliyor(false)
    }
  }

  const terminUyari = (() => {
    const pct = Number(form.ilerlemeYuzde || 0)
    if (!form.terminTarihi || pct >= 100) return null
    const diff = terminGunFarki(form.terminTarihi)
    if (diff == null) return null
    if (diff < 0) {
      return { text: `Termin gecmis: Terminin uzerinden ${Math.abs(diff)} gun gecikme var.`, color: '#991b1b', bg: '#fee2e2' }
    }
    if (diff === 0) {
      return { text: 'Dikkat: Siparisin termin tarihi bugun.', color: '#9a3412', bg: '#ffedd5' }
    }
    if (diff <= 3) {
      return { text: `Termin yaklasti: Termine ${diff} gun kaldi.`, color: '#9a3412', bg: '#ffedd5' }
    }
    return null
  })()

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
          <h1 className="font-semibold text-gray-800 text-sm">Guncel Siparisler Durum Girisleri</h1>
          <p className="text-xs text-gray-400">Operator giris ekrani</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#F5F7FA', color: '#6b7280' }}>
          Yeni siparis ekleyebilir veya var olan siparisi secip durumunu guncelleyebilirsin.
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">Kayitli Siparisten Doldur (opsiyonel)</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const secili = items.find((x) => x.id === e.target.value)
              if (secili) seciliYukle(secili)
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-700 bg-white"
          >
            <option value="">Sec...</option>
            {alfabetikItems.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ulke} - {x.firma} / %{Number(x.ilerlemeYuzde || 0)} / {Number(x.siparisKg || 0).toLocaleString('tr-TR')} kg
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={yeniSiparisModu}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 bg-white"
          >
            Yeni Siparis Ekle
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ulke</label>
            <input value={form.ulke} onChange={(e) => setForm((f) => ({ ...f, ulke: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Firma</label>
            <input value={form.firma} onChange={(e) => setForm((f) => ({ ...f, firma: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Siparis adi</label>
          <input value={form.siparisAdi} onChange={(e) => setForm((f) => ({ ...f, siparisAdi: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Siparis kg</label>
          <input type="number" min="0" value={form.siparisKg} onChange={(e) => setForm((f) => ({ ...f, siparisKg: e.target.value }))} placeholder="Orn: 120405" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ilerleme (%)</label>
            <input type="number" min="0" max="100" value={form.ilerlemeYuzde} onChange={(e) => setForm((f) => ({ ...f, ilerlemeYuzde: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Gelis tarihi</label>
            <input type="date" value={form.gelisTarihi} onChange={(e) => setForm((f) => ({ ...f, gelisTarihi: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Termin tarihi</label>
          <input type="date" value={form.terminTarihi} onChange={(e) => setForm((f) => ({ ...f, terminTarihi: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Tamamlanma tarihi (varsa)</label>
          <input type="date" value={form.tamamlanmaTarihi} onChange={(e) => setForm((f) => ({ ...f, tamamlanmaTarihi: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 bg-white">
          <input
            type="checkbox"
            checked={Boolean(form.sevkEdildi)}
            onChange={(e) => setForm((f) => ({ ...f, sevkEdildi: e.target.checked }))}
            className="w-4 h-4"
            disabled={Number(form.ilerlemeYuzde || 0) < 100}
          />
          <span className="text-xs text-gray-700">Siparis sevk edildi</span>
        </label>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Durum notu</label>
          <input value={form.durumNotu} onChange={(e) => setForm((f) => ({ ...f, durumNotu: e.target.value }))} placeholder="Uretim durumu, gecikme, sevk notu..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" />
        </div>

        {hata && <p className="text-xs text-red-500">{hata}</p>}
        {mesaj && <p className="text-xs text-green-600">{mesaj}</p>}
        {terminUyari && (
          <div className="rounded-xl px-3 py-2 text-xs" style={{ color: terminUyari.color, backgroundColor: terminUyari.bg }}>
            {terminUyari.text}
          </div>
        )}
        {loading && <p className="text-xs text-gray-400">Kayitli siparisler yukleniyor...</p>}

        <button
          onClick={kaydet}
          disabled={kaydediliyor}
          className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 shadow-sm"
          style={{ backgroundColor: '#CC2B1D' }}
        >
          {kaydediliyor ? 'Kaydediliyor...' : (form.id ? 'Siparisi Guncelle' : 'Durumu Kaydet')}
        </button>
      </div>
    </div>
  )
}
