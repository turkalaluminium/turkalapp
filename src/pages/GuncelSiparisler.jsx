import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

const DAY_MS = 24 * 60 * 60 * 1000
const AY_ADLARI = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']

function formatDate(d) {
  if (!d) return '-'
  return d
}

function formatKg(v) {
  return `${Number(v || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg`
}

function startOfDay(input) {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = startOfDay(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = startOfDay(new Date())
  return Math.round((target - today) / DAY_MS)
}

function completionDays(item) {
  if (!item?.gelisTarihi || !item?.tamamlanmaTarihi) return null
  const start = startOfDay(`${item.gelisTarihi}T00:00:00`)
  const end = startOfDay(`${item.tamamlanmaTarihi}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return Math.max(0, Math.round((end - start) / DAY_MS))
}

function getTerminStatus(item) {
  const pct = Number(item.ilerlemeYuzde || 0)
  if (pct >= 100) {
    return { key: 'done', label: 'Tamamlandi', fg: '#166534', bg: '#dcfce7', sortRank: 7 }
  }

  const diff = daysUntil(item.terminTarihi)
  if (diff == null) {
    return { key: 'none', label: 'Termin yok', fg: '#4b5563', bg: '#f3f4f6', sortRank: 6 }
  }
  if (diff < 0) {
    return { key: 'late', label: `Termin gecikti: ${Math.abs(diff)} gun`, fg: '#991b1b', bg: '#fee2e2', sortRank: 0 }
  }
  if (diff === 0) {
    return { key: 'today', label: 'Bugun termin', fg: '#9a3412', bg: '#ffedd5', sortRank: 1 }
  }
  if (diff <= 3) {
    return { key: 'soon', label: `Termine kalan: ${diff} gun`, fg: '#9a3412', bg: '#ffedd5', sortRank: 2 }
  }
  return { key: 'normal', label: `Termine kalan: ${diff} gun`, fg: '#166534', bg: '#dcfce7', sortRank: 3 }
}

export default function GuncelSiparisler() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')
  const [siparisNoArama, setSiparisNoArama] = useState('')
  const [siparisNoFilter, setSiparisNoFilter] = useState('')
  const [ulkeFilter, setUlkeFilter] = useState('all')
  const [firmaFilter, setFirmaFilter] = useState('all')
  const [durumFilter, setDurumFilter] = useState('all')
  const [sevkFilter, setSevkFilter] = useState('all')
  const [terminFilter, setTerminFilter] = useState('all')
  const [hazirlikSort, setHazirlikSort] = useState('pctDesc')
  const [hizliGorunum, setHizliGorunum] = useState('all')

  function filtreleriSifirla() {
    setArama('')
    setSiparisNoArama('')
    setSiparisNoFilter('')
    setUlkeFilter('all')
    setFirmaFilter('all')
    setDurumFilter('all')
    setSevkFilter('all')
    setTerminFilter('all')
    setHazirlikSort('pctDesc')
    setHizliGorunum('all')
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

  const enrichedItems = useMemo(() => {
    return items
      .map((x) => ({ ...x, terminStatus: getTerminStatus(x) }))
      .sort((a, b) => {
        const aHas = Boolean(a.terminTarihi)
        const bHas = Boolean(b.terminTarihi)
        if (aHas && bHas) {
          const byTermin = String(a.terminTarihi).localeCompare(String(b.terminTarihi))
          if (byTermin !== 0) return byTermin
        } else if (aHas !== bHas) {
          return aHas ? -1 : 1
        }
        return String(b.guncellenme || '').localeCompare(String(a.guncellenme || ''))
      })
  }, [items])

  const ulkeler = useMemo(() => {
    return [...new Set(items.map((x) => String(x.ulke || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [items])

  const firmalar = useMemo(() => {
    return [...new Set(items.map((x) => String(x.firma || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [items])

  const filteredItems = useMemo(() => {
    const q = String(arama || '').trim().toLowerCase()
    const siparisNoQ = String(siparisNoFilter || '').trim().toLowerCase()
    const filtered = enrichedItems.filter((x) => {
      const pct = Number(x.ilerlemeYuzde || 0)
      const durumKey = pct >= 100 ? 'tamamlandi' : 'devam'
      const terminKey = x.terminStatus.key
      const diff = daysUntil(x.terminTarihi)

      if (ulkeFilter !== 'all' && x.ulke !== ulkeFilter) return false
      if (firmaFilter !== 'all' && x.firma !== firmaFilter) return false
      if (durumFilter !== 'all' && durumKey !== durumFilter) return false
      if (sevkFilter === 'sevkEdildi' && !x.sevkEdildi) return false
      if (sevkFilter === 'sevkEdilmedi' && x.sevkEdildi) return false
      if (terminFilter !== 'all') {
        if (terminFilter === 'geciken' && terminKey !== 'late') return false
        if (terminFilter === 'bugun' && terminKey !== 'today') return false
        if (terminFilter === 'yaklasan' && !['today', 'soon'].includes(terminKey)) return false
        if (terminFilter === 'normal' && terminKey !== 'normal') return false
        if (terminFilter === 'terminYok' && terminKey !== 'none') return false
      }
      if (hizliGorunum !== 'all') {
        if (hizliGorunum === 'tamamlandi' && pct < 100) return false
        if (hizliGorunum === 'devam' && pct >= 100) return false
        if (hizliGorunum === 'geciken' && !(pct < 100 && diff != null && diff < 0)) return false
        if (hizliGorunum === 'buHaftaTermin' && !(pct < 100 && diff != null && diff >= 0 && diff <= 7)) return false
      }
      if (siparisNoQ && String(x.siparisNo || '').trim().toLowerCase() !== siparisNoQ) return false

      if (!q) return true
      const alan = `${x.ulke} ${x.firma} ${x.siparisAdi} ${x.siparisNo || ''} ${x.durumNotu || ''}`.toLowerCase()
      return alan.includes(q)
    })

    if (hazirlikSort === 'pctDesc') {
      return [...filtered].sort((a, b) => {
        const byPct = Number(b.ilerlemeYuzde || 0) - Number(a.ilerlemeYuzde || 0)
        if (byPct !== 0) return byPct
        return String(b.guncellenme || '').localeCompare(String(a.guncellenme || ''))
      })
    }

    if (hazirlikSort === 'pctAsc') {
      return [...filtered].sort((a, b) => {
        const byPct = Number(a.ilerlemeYuzde || 0) - Number(b.ilerlemeYuzde || 0)
        if (byPct !== 0) return byPct
        return String(b.guncellenme || '').localeCompare(String(a.guncellenme || ''))
      })
    }

    return filtered
  }, [arama, siparisNoFilter, ulkeFilter, firmaFilter, durumFilter, sevkFilter, terminFilter, hazirlikSort, hizliGorunum, enrichedItems])

  const ozet = useMemo(() => {
    const toplam = items.length
    const tamamlanan = items.filter((x) => Number(x.ilerlemeYuzde || 0) >= 100).length
    const devam = toplam - tamamlanan
    const geciken = items.filter((x) => {
      if (Number(x.ilerlemeYuzde || 0) >= 100) return false
      const diff = daysUntil(x.terminTarihi)
      return diff != null && diff < 0
    }).length
    const buHaftaTermin = items.filter((x) => {
      if (Number(x.ilerlemeYuzde || 0) >= 100) return false
      const diff = daysUntil(x.terminTarihi)
      return diff != null && diff >= 0 && diff <= 7
    }).length
    return { toplam, tamamlanan, devam, geciken, buHaftaTermin }
  }, [items])

  const aylikSevkOzeti = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const toplamKg = items.reduce((acc, x) => {
      if (!(Number(x.ilerlemeYuzde || 0) >= 100) || !x.sevkEdildi || !x.tamamlanmaTarihi) return acc
      const t = new Date(`${x.tamamlanmaTarihi}T00:00:00`)
      if (Number.isNaN(t.getTime())) return acc
      if (t.getMonth() !== month || t.getFullYear() !== year) return acc
      return acc + Number(x.siparisKg || 0)
    }, 0)
    return {
      ayLabel: AY_ADLARI[month] || 'Bu Ay',
      toplamKg,
    }
  }, [items])

  const iceridekiSiparisOzeti = useMemo(() => {
    const toplamSiparisKg = items.reduce((acc, x) => acc + Number(x.siparisKg || 0), 0)
    const sevkEdilenKg = items.reduce((acc, x) => {
      if (!x.sevkEdildi) return acc
      return acc + Number(x.siparisKg || 0)
    }, 0)
    return {
      iceridekiKg: Math.max(0, toplamSiparisKg - sevkEdilenKg),
      sevkEdilenKg,
    }
  }, [items])

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
          <h1 className="font-semibold text-gray-800 text-sm">Guncel Siparisler</h1>
          <p className="text-xs text-gray-400">Patron gorunumu (salt okunur)</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        <div className="rounded-2xl p-4 text-white shadow-sm" style={{ backgroundColor: '#CC2B1D' }}>
          <p className="text-xs text-white/80 mb-1">{aylikSevkOzeti.ayLabel} Ay</p>
          <p className="text-2xl font-semibold">{formatKg(aylikSevkOzeti.toplamKg)}</p>
          <p className="text-[11px] text-white/80 mt-1">Tamamlanan + sevk edilen siparisler toplami</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHizliGorunum('all')}
            className="rounded-xl border p-3 text-left"
            style={hizliGorunum === 'all'
              ? { borderColor: '#CC2B1D', backgroundColor: '#FDECEA' }
              : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }
            }
          >
            <p className="text-[11px] text-gray-400">Toplam</p>
            <p className="text-base font-semibold text-gray-800">{ozet.toplam}</p>
          </button>
          <button
            type="button"
            onClick={() => setHizliGorunum('devam')}
            className="rounded-xl border p-3 text-left"
            style={hizliGorunum === 'devam'
              ? { borderColor: '#f59e0b', backgroundColor: '#fffbeb' }
              : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }
            }
          >
            <p className="text-[11px] text-gray-400">Devam</p>
            <p className="text-base font-semibold text-amber-600">{ozet.devam}</p>
          </button>
          <button
            type="button"
            onClick={() => setHizliGorunum('tamamlandi')}
            className="rounded-xl border p-3 text-left"
            style={hizliGorunum === 'tamamlandi'
              ? { borderColor: '#16a34a', backgroundColor: '#f0fdf4' }
              : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }
            }
          >
            <p className="text-[11px] text-gray-400">Tamamlandi</p>
            <p className="text-base font-semibold text-green-600">{ozet.tamamlanan}</p>
          </button>
          <button
            type="button"
            onClick={() => setHizliGorunum('geciken')}
            className="rounded-xl border p-3 text-left"
            style={hizliGorunum === 'geciken'
              ? { borderColor: '#fca5a5', backgroundColor: '#fee2e2' }
              : { borderColor: '#fecaca', backgroundColor: '#fef2f2' }
            }
          >
            <p className="text-[11px] text-red-400">Geciken siparis</p>
            <p className="text-base font-semibold text-red-700">{ozet.geciken}</p>
          </button>
          <button
            type="button"
            onClick={() => setHizliGorunum('buHaftaTermin')}
            className="rounded-xl border p-3 text-left"
            style={hizliGorunum === 'buHaftaTermin'
              ? { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }
              : { borderColor: '#fde68a', backgroundColor: '#fffbeb' }
            }
          >
            <p className="text-[11px] text-amber-500">Bu hafta termin</p>
            <p className="text-base font-semibold text-amber-700">{ozet.buHaftaTermin}</p>
          </button>
          <div className="rounded-xl border border-sky-100 p-3 bg-sky-50">
            <p className="text-[11px] text-sky-500">Icerideki siparis kg</p>
            <p className="text-base font-semibold text-sky-700">{formatKg(iceridekiSiparisOzeti.iceridekiKg)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 px-3 py-2 bg-white">
          <p className="text-xs text-gray-500">Not: "Termine kalan" ifadesi, teslim termin tarihine kalan gunu gosterir.</p>
        </div>

        <div className="rounded-xl border border-gray-200 p-3 bg-white space-y-2">
          <p className="text-xs font-medium text-gray-500">Arama ve Filtre</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const value = String(siparisNoArama || '').trim()
              setSiparisNoFilter(value)
            }}
          >
            <input
              type="text"
              value={siparisNoArama}
              onChange={(e) => setSiparisNoArama(e.target.value)}
              placeholder="Siparis numarasi yaz..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="px-4 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 bg-white"
            >
              Goster
            </button>
          </form>
          {siparisNoFilter && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-[11px] text-gray-500">Siparis No filtresi: <span className="font-medium text-gray-700">{siparisNoFilter}</span></p>
              <button
                type="button"
                onClick={() => {
                  setSiparisNoArama('')
                  setSiparisNoFilter('')
                }}
                className="text-[11px] text-gray-500 underline"
              >
                Temizle
              </button>
            </div>
          )}
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ulke, firma, siparis adi/no veya not ara..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={ulkeFilter} onChange={(e) => setUlkeFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white">
              <option value="all">Ulke: Tum</option>
              {ulkeler.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={firmaFilter} onChange={(e) => setFirmaFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white">
              <option value="all">Firma: Tum</option>
              {firmalar.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white">
              <option value="all">Durum: Tum</option>
              <option value="devam">Devam ediyor</option>
              <option value="tamamlandi">Tamamlandi</option>
            </select>
            <select value={sevkFilter} onChange={(e) => setSevkFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white">
              <option value="all">Sevk: Tum</option>
              <option value="sevkEdildi">Sevk edildi</option>
              <option value="sevkEdilmedi">Sevk edilmedi</option>
            </select>
            <select value={terminFilter} onChange={(e) => setTerminFilter(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white col-span-2">
              <option value="all">Termin: Tum</option>
              <option value="geciken">Geciken</option>
              <option value="bugun">Bugun termin</option>
              <option value="yaklasan">Yaklasan (0-3 gun)</option>
              <option value="normal">Normal</option>
              <option value="terminYok">Termin yok</option>
            </select>
            <select value={hazirlikSort} onChange={(e) => setHazirlikSort(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white col-span-2">
              <option value="termin">Siralama: Termin oncelikli</option>
              <option value="pctDesc">Siralama: Hazirlik % (buyukten kucuge)</option>
              <option value="pctAsc">Siralama: Hazirlik % (kucukten buyuge)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={filtreleriSifirla}
            className="w-full py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 bg-gray-50"
          >
            Filtreleri Sifirla
          </button>
          <p className="text-[11px] text-gray-400">Gorunen siparis: {filteredItems.length}</p>
        </div>

        <button
          onClick={yukle}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 bg-white"
        >
          Simdi yenile
        </button>

        {loading && <p className="text-xs text-gray-400">Yukleniyor...</p>}
        {hata && <p className="text-xs text-red-500">{hata}</p>}

        <div className="space-y-3">
          {filteredItems.map((x, idx) => {
            const tamamlanmaGun = completionDays(x)
            return (
            <div key={x.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-medium">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-gray-800">{x.ulke} - {x.firma}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{x.siparisAdi}</p>
                  {x.siparisNo && (
                    <p className="text-[11px] text-gray-400 mt-0.5">Siparis No: {x.siparisNo}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {x.sevkEdildi && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-semibold bg-sky-100 text-sky-700 border border-sky-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L9.25 10.69 7.28 8.72a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l3.99-4z" clipRule="evenodd" />
                      </svg>
                      Sevk edildi
                    </span>
                  )}
                  <span
                    className="text-[11px] px-2 py-1 rounded-md font-medium"
                    style={{
                      color: Number(x.ilerlemeYuzde || 0) >= 100 ? '#166534' : '#9a3412',
                      backgroundColor: Number(x.ilerlemeYuzde || 0) >= 100 ? '#dcfce7' : '#ffedd5',
                    }}
                  >
                    %{Number(x.ilerlemeYuzde || 0)}
                  </span>
                  <span
                    className="text-[11px] px-2 py-1 rounded-md font-medium"
                    style={{ color: x.terminStatus.fg, backgroundColor: x.terminStatus.bg }}
                  >
                    {x.terminStatus.label}
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-md font-medium bg-gray-100 text-gray-600">
                    {formatKg(x.siparisKg || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, Number(x.ilerlemeYuzde || 0)))}%`,
                    backgroundColor: Number(x.ilerlemeYuzde || 0) >= 100 ? '#16a34a' : '#CC2B1D',
                  }}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-gray-600">
                  Gelis: <strong>{formatDate(x.gelisTarihi)}</strong>
                </div>
                <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-gray-600">
                  Termin: <strong>{formatDate(x.terminTarihi)}</strong>
                </div>
                <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-gray-600">
                  Tamamlanma: <strong>{formatDate(x.tamamlanmaTarihi)}</strong>
                </div>
                {Number(x.ilerlemeYuzde || 0) >= 100 && tamamlanmaGun != null && (
                  <div className="rounded-lg bg-green-50 px-2.5 py-2 text-green-700">
                    Tamamlanma suresi: <strong>{tamamlanmaGun} gun</strong>
                  </div>
                )}
              </div>

              {x.durumNotu && <p className="mt-2 text-xs text-gray-500">{x.durumNotu}</p>}
            </div>
            )
          })}
        </div>

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400">
            Filtreye uygun siparis bulunmuyor.
          </div>
        )}
      </div>
    </div>
  )
}
