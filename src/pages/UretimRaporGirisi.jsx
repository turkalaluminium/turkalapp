import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

function formatKg(value) {
  return `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg`
}

export default function UretimRaporGirisi() {
  const navigate = useNavigate()
  const [tarih, setTarih] = useState(bugun())
  const [presTon, setPresTon] = useState('0')
  const [eloksalTon, setEloksalTon] = useState('0')
  const [not, setNot] = useState('')

  const [baraSayisi, setBaraSayisi] = useState('')
  const [yagAlmaBaraSayisi, setYagAlmaBaraSayisi] = useState('')
  const [matBaraSayisi, setMatBaraSayisi] = useState('')
  const [renkBaraSayisi, setRenkBaraSayisi] = useState('')
  const [eloksalCalisanKisi, setEloksalCalisanKisi] = useState('')
  const [eloksalArizaNotu, setEloksalArizaNotu] = useState('')

  const [calisanPresSayisi, setCalisanPresSayisi] = useState('')
  const [pres1Kg, setPres1Kg] = useState('')
  const [pres2Kg, setPres2Kg] = useState('')
  const [pres1FiresiPct, setPres1FiresiPct] = useState('')
  const [pres2FiresiPct, setPres2FiresiPct] = useState('')
  const [presArizaNotu, setPresArizaNotu] = useState('')
  const [loading, setLoading] = useState(false)
  const [tarihYukleniyor, setTarihYukleniyor] = useState(false)
  const [hata, setHata] = useState('')
  const [mesaj, setMesaj] = useState('')

  const presAnaKg = Number(presTon || 0)
  const presDetayToplamKg = Number(pres1Kg || 0) + Number(pres2Kg || 0)
  const presDetayGirildi = String(pres1Kg).trim() !== '' || String(pres2Kg).trim() !== ''
  const presKgUyumsuz = presDetayGirildi && Math.abs(presAnaKg - presDetayToplamKg) > 0.01
  const toplamBara = Number(baraSayisi || 0)
  const detayBaraToplami = Number(matBaraSayisi || 0) + Number(renkBaraSayisi || 0) + Number(yagAlmaBaraSayisi || 0)
  const baraDetayGirildi = String(matBaraSayisi).trim() !== '' || String(renkBaraSayisi).trim() !== '' || String(yagAlmaBaraSayisi).trim() !== ''
  const baraUyumsuz = baraDetayGirildi && Math.abs(toplamBara - detayBaraToplami) > 0.01

  function alanlariTemizle() {
    setPresTon('0')
    setEloksalTon('0')
    setNot('')
    setCalisanPresSayisi('')
    setPres1Kg('')
    setPres2Kg('')
    setPres1FiresiPct('')
    setPres2FiresiPct('')
    setPresArizaNotu('')
    setBaraSayisi('')
    setYagAlmaBaraSayisi('')
    setMatBaraSayisi('')
    setRenkBaraSayisi('')
    setEloksalCalisanKisi('')
    setEloksalArizaNotu('')
  }

  function raporuFormaYukle(rapor) {
    setPresTon(String(rapor?.presTon ?? 0))
    setEloksalTon(String(rapor?.eloksalTon ?? 0))
    setNot(String(rapor?.not || ''))
    setCalisanPresSayisi(String(rapor?.presDetay?.calisanPresSayisi ?? ''))
    setPres1Kg(String(rapor?.presDetay?.pres1Kg ?? ''))
    setPres2Kg(String(rapor?.presDetay?.pres2Kg ?? ''))
    setPres1FiresiPct(String(rapor?.presDetay?.pres1FiresiPct ?? rapor?.presDetay?.presFiresiPct ?? ''))
    setPres2FiresiPct(String(rapor?.presDetay?.pres2FiresiPct ?? rapor?.presDetay?.presFiresiPct ?? ''))
    setPresArizaNotu(String(rapor?.presDetay?.arizaNotu || ''))
    setBaraSayisi(String(rapor?.eloksalDetay?.baraSayisi ?? rapor?.eloksalDetay?.barSayisi ?? ''))
    setYagAlmaBaraSayisi(String(rapor?.eloksalDetay?.yagAlmaBaraSayisi ?? ''))
    setMatBaraSayisi(String(rapor?.eloksalDetay?.matBaraSayisi ?? rapor?.eloksalDetay?.matBarSayisi ?? ''))
    setRenkBaraSayisi(String(rapor?.eloksalDetay?.renkBaraSayisi ?? rapor?.eloksalDetay?.renkBarSayisi ?? ''))
    setEloksalCalisanKisi(String(rapor?.eloksalDetay?.calisanKisiSayisi ?? ''))
    setEloksalArizaNotu(String(rapor?.eloksalDetay?.arizaNotu || ''))
  }

  useEffect(() => {
    let aktif = true

    async function seciliTarihiYukle() {
      if (!tarih) return
      try {
        setTarihYukleniyor(true)
        const res = await fetch(apiUrl('/api/production-reports'))
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!aktif) return
        const items = Array.isArray(data.items) ? data.items : []
        const secili = items.find((x) => x.tarih === tarih)
        if (secili) {
          raporuFormaYukle(secili)
          setMesaj('Secili tarih icin kayitli rapor yüklendi')
        } else {
          alanlariTemizle()
          setMesaj('')
        }
        setHata('')
      } catch (err) {
        if (!aktif) return
        setHata(err.message || 'Secili tarih raporu alinamadi')
      } finally {
        if (aktif) setTarihYukleniyor(false)
      }
    }

    seciliTarihiYukle()
    return () => {
      aktif = false
    }
  }, [tarih])

  async function kaydet() {
    const p = Number(presTon)
    const e = Number(eloksalTon)
    const fire1Pct = Number(pres1FiresiPct || 0)
    const fire2Pct = Number(pres2FiresiPct || 0)
    if (!tarih) return setHata('Tarih zorunlu')
    if (!Number.isFinite(p) || !Number.isFinite(e) || p < 0 || e < 0) {
      return setHata('Pres ve Eloksal kg degerleri 0 veya daha buyuk olmali')
    }
    if (!Number.isFinite(fire1Pct) || fire1Pct < 0 || fire1Pct > 100 || !Number.isFinite(fire2Pct) || fire2Pct < 0 || fire2Pct > 100) {
      return setHata('Pres 1 fire ve Pres 2 fire % degerleri 0 ile 100 arasinda olmali')
    }
    if (presKgUyumsuz) {
      return setHata(`Pres kg uyusmuyor: Ana Pres ${formatKg(p)} / Pres Detay Toplam ${formatKg(presDetayToplamKg)}`)
    }
    if (baraUyumsuz) {
      return setHata(`Bara sayilari uyusmuyor: Toplam Bara ${toplamBara} / Detay Toplam ${detayBaraToplami}`)
    }

    setLoading(true)
    setHata('')
    setMesaj('')
    try {
      const res = await fetch(apiUrl('/api/production-reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tarih,
          presTon: p,
          eloksalTon: e,
          not: not.trim(),
          eloksalDetay: {
            baraSayisi: Number(baraSayisi || 0),
            yagAlmaBaraSayisi: Number(yagAlmaBaraSayisi || 0),
            matBaraSayisi: Number(matBaraSayisi || 0),
            renkBaraSayisi: Number(renkBaraSayisi || 0),
            calisanKisiSayisi: Number(eloksalCalisanKisi || 0),
            arizaNotu: eloksalArizaNotu.trim(),
          },
          presDetay: {
            calisanPresSayisi: Number(calisanPresSayisi || 0),
            pres1Kg: Number(pres1Kg || 0),
            pres2Kg: Number(pres2Kg || 0),
            pres1FiresiPct: fire1Pct,
            pres2FiresiPct: fire2Pct,
            arizaNotu: presArizaNotu.trim(),
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)

      setMesaj('Rapor kaydedildi')
      raporuFormaYukle(data?.item || {})
    } catch (err) {
      setHata(err.message || 'Rapor kaydedilemedi')
    } finally {
      setLoading(false)
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
          <h1 className="font-semibold text-gray-800 text-sm">Uretim Rapor Girisi</h1>
          <p className="text-xs text-gray-400">Operatör ekrani</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#F5F7FA', color: '#6b7280' }}>
          Bu ekran veri giris icindir. Kaydedilen raporlar patron ekraninda gorunur.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 text-white text-left" style={{ backgroundColor: '#CC2B1D' }}>
            <p className="text-[11px] text-white/80 mb-1">Pres</p>
            <p className="text-lg font-semibold">
              {presTon ? formatKg(presTon) : formatKg(0)}
            </p>
            <p className="text-[10px] text-white/70 mt-1">Toplam pres uretimi</p>
          </div>
          <div className="rounded-xl p-3 text-white text-left" style={{ backgroundColor: '#CC2B1D' }}>
            <p className="text-[11px] text-white/80 mb-1">Eloksal</p>
            <p className="text-lg font-semibold">
              {eloksalTon ? formatKg(eloksalTon) : formatKg(0)}
            </p>
            <p className="text-[10px] text-white/70 mt-1">Toplam eloksal uretimi</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTarih(bugun())}
            className="flex-1 py-2 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white"
          >
            Bugun
          </button>
          <button
            type="button"
            onClick={() => alanlariTemizle()}
            className="flex-1 py-2 rounded-lg text-xs border border-gray-200 text-gray-600 bg-white"
          >
            Alanlari Temizle
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => {
              setMesaj('')
              setHata('')
              setTarih(e.target.value)
            }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
        </div>

        {tarihYukleniyor && <p className="text-xs text-gray-400">Secili tarih raporu yukleniyor...</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Pres (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={presTon}
              onChange={(e) => setPresTon(e.target.value)}
              placeholder="Orn: 11200"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Eloksal (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={eloksalTon}
              onChange={(e) => setEloksalTon(e.target.value)}
              placeholder="Orn: 5200"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Not</label>
          <input
            type="text"
            value={not}
            onChange={(e) => setNot(e.target.value)}
            placeholder="Vardiya, durus, aciklama"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div className="rounded-xl border border-gray-200 p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700">Eloksal Detay Girisi</h3>
          <div className="space-y-2">
            <input
              type="number"
              value={matBaraSayisi}
              onChange={(e) => setMatBaraSayisi(e.target.value)}
              placeholder="Mat bara sayisi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={renkBaraSayisi}
              onChange={(e) => setRenkBaraSayisi(e.target.value)}
              placeholder="Renk bara sayisi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={yagAlmaBaraSayisi}
              onChange={(e) => setYagAlmaBaraSayisi(e.target.value)}
              placeholder="Yag alma bara sayisi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={baraSayisi}
              onChange={(e) => setBaraSayisi(e.target.value)}
              placeholder="Toplam bara sayisi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={eloksalCalisanKisi}
              onChange={(e) => setEloksalCalisanKisi(e.target.value)}
              placeholder="Calisan sayisi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={eloksalArizaNotu}
            onChange={(e) => setEloksalArizaNotu(e.target.value)}
            placeholder="Aciklama (ariza varsa)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {baraUyumsuz && (
            <p className="text-xs text-amber-600">
              Uyari: Toplam bara {toplamBara} ile mat+renk+yag alma toplami {detayBaraToplami} esit degil.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-3 space-y-3">
          <h3 className="text-xs font-semibold text-gray-700">Pres Detay Girisi</h3>
          <input
            type="number"
            value={calisanPresSayisi}
            onChange={(e) => setCalisanPresSayisi(e.target.value)}
            placeholder="Kac pres calisti"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={pres1Kg}
              onChange={(e) => setPres1Kg(e.target.value)}
              placeholder="Pres 1 kg"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={pres2Kg}
              onChange={(e) => setPres2Kg(e.target.value)}
              placeholder="Pres 2 kg"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={pres1FiresiPct}
              onChange={(e) => setPres1FiresiPct(e.target.value)}
              placeholder="Pres 1 fire (%)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={pres2FiresiPct}
              onChange={(e) => setPres2FiresiPct(e.target.value)}
              placeholder="Pres 2 fire (%)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            value={presArizaNotu}
            onChange={(e) => setPresArizaNotu(e.target.value)}
            placeholder="Ariza/aciklama (kalip yurumedı, kirildi vb.)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          {presKgUyumsuz && (
            <p className="text-xs text-amber-600">
              Uyari: Ana Pres {formatKg(presAnaKg)} ile Pres 1+2 toplami {formatKg(presDetayToplamKg)} esit degil.
            </p>
          )}
        </div>

        {hata && <p className="text-xs text-red-500">{hata}</p>}
        {mesaj && <p className="text-xs text-green-600">{mesaj}</p>}

        <button
          onClick={kaydet}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 shadow-sm"
          style={{ backgroundColor: '#CC2B1D' }}
        >
          {loading ? 'Kaydediliyor...' : 'Raporu Kaydet'}
        </button>
      </div>
    </div>
  )
}
