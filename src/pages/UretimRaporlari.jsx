import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

function bugun() {
  return new Date().toISOString().slice(0, 10)
}

const RANGE_OPTIONS = [
  { key: '3d', label: 'Son 3 gun', days: 3 },
  { key: '7d', label: 'Son 1 hafta', days: 7 },
  { key: '14d', label: 'Son 2 hafta', days: 14 },
  { key: '30d', label: 'Son 1 ay', days: 30 },
  { key: '90d', label: 'Son 3 ay', days: 90 },
  { key: 'prevMonth', label: 'Son ay', days: null },
  { key: '365d', label: 'Son 1 yil', days: 365 },
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

function parseReportDate(tarih) {
  return startOfDay(`${tarih}T00:00:00`)
}

function formatKg(value) {
  return `${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} kg`
}

function formatPct(value) {
  return `%${Number(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
}

function getRangeDates(key) {
  const now = startOfDay(new Date())
  const opt = RANGE_OPTIONS.find((x) => x.key === key) || RANGE_OPTIONS[1]

  if (opt.key === 'prevMonth') {
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1)
    const previousMonthEnd = addDays(currentMonthStart, -1)
    return { from: previousMonthStart, to: previousMonthEnd, days: null }
  }

  const from = addDays(now, -(opt.days - 1))
  return { from, to: now, days: opt.days }
}

function getPreviousRange(key) {
  const current = getRangeDates(key)
  if (key === 'prevMonth') {
    const monthBeforeStart = new Date(current.from.getFullYear(), current.from.getMonth() - 1, 1)
    const monthBeforeEnd = addDays(current.from, -1)
    return { from: monthBeforeStart, to: monthBeforeEnd }
  }
  const days = current.days || 1
  const to = addDays(current.from, -1)
  const from = addDays(to, -(days - 1))
  return { from, to }
}

function filterByRange(items, range) {
  return items.filter((x) => {
    const d = parseReportDate(x.tarih)
    return d >= range.from && d <= range.to
  })
}

function sumValues(items, key) {
  return items.reduce((acc, x) => acc + Number(x[key] || 0), 0)
}

export default function UretimRaporlari() {
  const navigate = useNavigate()
  const [tarih, setTarih] = useState('')
  const [rangeKey, setRangeKey] = useState('7d')
  const [aktifDetay, setAktifDetay] = useState(null)
  const [hata, setHata] = useState('')
  const [loading, setLoading] = useState(false)
  const [raporlar, setRaporlar] = useState([])

  useEffect(() => {
    let aktif = true

    async function yukle() {
      try {
        setLoading(true)
        const res = await fetch(apiUrl('/api/production-reports'))
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!aktif) return
        setRaporlar(Array.isArray(data.items) ? data.items : [])
        setHata('')
      } catch (err) {
        if (!aktif) return
        setHata(err.message || 'Raporlar alinamadi')
      } finally {
        if (aktif) setLoading(false)
      }
    }

    yukle()
    const id = setInterval(yukle, 60 * 1000)
    return () => {
      aktif = false
      clearInterval(id)
    }
  }, [])

  async function manuelYenile() {
    try {
      setLoading(true)
      const res = await fetch(apiUrl('/api/production-reports'))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setRaporlar(Array.isArray(data.items) ? data.items : [])
      setHata('')
    } catch (err) {
      setHata(err.message || 'Raporlar alinamadi')
    } finally {
      setLoading(false)
    }
  }

  const seciliGunOzeti = useMemo(() => {
    const gun = raporlar.find((x) => x.tarih === tarih)
    if (!gun) return null
    return `${gun.tarih} gunu Pres ${formatKg(gun.presTon)}, Eloksal ${formatKg(gun.eloksalTon)} uretim yapti.`
  }, [raporlar, tarih])

  const seciliRapor = raporlar.find((x) => x.tarih === tarih) || null
  const buAyToplamlari = useMemo(() => {
    const now = new Date()
    const ay = now.getMonth()
    const yil = now.getFullYear()
    const buAy = raporlar.filter((x) => {
      const d = parseReportDate(x.tarih)
      return d.getMonth() === ay && d.getFullYear() === yil
    })
    return {
      pres: sumValues(buAy, 'presTon'),
      eloksal: sumValues(buAy, 'eloksalTon'),
    }
  }, [raporlar])
  const sortedAsc = useMemo(
    () => [...raporlar].sort((a, b) => a.tarih.localeCompare(b.tarih)),
    [raporlar]
  )
  const chartData = useMemo(() => {
    const currentRange = getRangeDates(rangeKey)
    const previousRange = getPreviousRange(rangeKey)
    const currentItems = filterByRange(sortedAsc, currentRange)
    const previousItems = filterByRange(sortedAsc, previousRange)

    const currentPres = sumValues(currentItems, 'presTon')
    const currentEloksal = sumValues(currentItems, 'eloksalTon')
    const prevPres = sumValues(previousItems, 'presTon')
    const prevEloksal = sumValues(previousItems, 'eloksalTon')

    const maxVal = Math.max(
      1,
      ...currentItems.map((x) => Number(x.presTon || 0)),
      ...currentItems.map((x) => Number(x.eloksalTon || 0))
    )

    const series = currentItems.map((x) => ({
      tarih: x.tarih,
      presTon: Number(x.presTon || 0),
      eloksalTon: Number(x.eloksalTon || 0),
      presPct: (Number(x.presTon || 0) / maxVal) * 100,
      eloksalPct: (Number(x.eloksalTon || 0) / maxVal) * 100,
    }))

    const presChangePct = prevPres > 0 ? ((currentPres - prevPres) / prevPres) * 100 : null
    const eloksalChangePct = prevEloksal > 0 ? ((currentEloksal - prevEloksal) / prevEloksal) * 100 : null

    return {
      series,
      currentPres,
      currentEloksal,
      presChangePct,
      eloksalChangePct,
      currentRange,
    }
  }, [sortedAsc, rangeKey])
  const lineChart = useMemo(() => {
    const series = chartData.series
    const height = 170
    const paddingX = 18
    const paddingTop = 14
    const plotHeight = 110
    const labelsY = 145
    const count = series.length
    const width = Math.max(260, (count > 1 ? (count - 1) * 56 : 0) + paddingX * 2)

    const points = series.map((p, i) => {
      const x = count <= 1
        ? width / 2
        : paddingX + (i * ((width - paddingX * 2) / (count - 1)))
      const presY = paddingTop + (1 - (p.presPct / 100)) * plotHeight
      const eloksalY = paddingTop + (1 - (p.eloksalPct / 100)) * plotHeight
      return { ...p, x, presY, eloksalY }
    })

    return {
      width,
      height,
      points,
      presPolyline: points.map((p) => `${p.x},${p.presY}`).join(' '),
      eloksalPolyline: points.map((p) => `${p.x},${p.eloksalY}`).join(' '),
    }
  }, [chartData.series])
  const tarihSecili = Boolean(tarih)
  const ustKartPresKg = tarihSecili
    ? (seciliRapor ? Number(seciliRapor.presTon || 0) : 0)
    : Number(buAyToplamlari.pres || 0)
  const ustKartEloksalKg = tarihSecili
    ? (seciliRapor ? Number(seciliRapor.eloksalTon || 0) : 0)
    : Number(buAyToplamlari.eloksal || 0)
  const seciliPresDetay = seciliRapor?.presDetay || {}
  const seciliEloksalDetay = seciliRapor?.eloksalDetay || {}
  const seciliPres1FiresiPct = Number(seciliPresDetay?.pres1FiresiPct ?? seciliPresDetay?.presFiresiPct ?? 0)
  const seciliPres2FiresiPct = Number(seciliPresDetay?.pres2FiresiPct ?? seciliPresDetay?.presFiresiPct ?? 0)

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
          <h1 className="font-semibold text-gray-800 text-sm">Uretim Raporlari</h1>
          <p className="text-xs text-gray-400">Patron gorunumu (salt okunur)</p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-4 space-y-3 border-b border-gray-100">
        <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#F5F7FA', color: '#6b7280' }}>
          Bu ekranda veri girisi kapali. Pres ve Eloksal kg verileri diger ekip tarafindan sisteme girilir, sen sadece goruntulersin.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => tarihSecili && setAktifDetay('pres')}
            className="rounded-xl p-3 text-white text-left"
            style={{ backgroundColor: '#CC2B1D' }}
          >
            <p className="text-[11px] text-white/80 mb-1">Pres</p>
            <p className="text-lg font-semibold">{formatKg(ustKartPresKg)}</p>
            <p className="text-[10px] text-white/80 mt-1">
              {tarihSecili
                ? `Fire P1/P2: ${formatPct(seciliPres1FiresiPct)} / ${formatPct(seciliPres2FiresiPct)}`
                : 'Bu ay toplam'}
            </p>
          </button>
          <button
            type="button"
            onClick={() => tarihSecili && setAktifDetay('eloksal')}
            className="rounded-xl p-3 text-white text-left"
            style={{ backgroundColor: '#CC2B1D' }}
          >
            <p className="text-[11px] text-white/80 mb-1">Eloksal</p>
            <p className="text-lg font-semibold">{formatKg(ustKartEloksalKg)}</p>
            <p className="text-[10px] text-white/70 mt-1">{tarihSecili ? 'Detay icin tikla' : 'Bu ay toplam'}</p>
          </button>
        </div>

        <button
          onClick={manuelYenile}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 bg-white"
        >
          Simdi yenile
        </button>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih</label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400"
          />
          <p className="text-[11px] text-gray-400 mt-1">Tarih bos ise ust kartlarda bu ay toplam uretim gorunur.</p>
        </div>
        {hata && <p className="text-xs text-red-500">{hata}</p>}
      </div>

      <div className="flex-1 px-5 py-4 space-y-3">
        {loading && <p className="text-sm text-gray-400">Raporlar yenileniyor...</p>}
        {seciliGunOzeti && (
          <div className="rounded-xl p-4" style={{ backgroundColor: '#FDECEA' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#CC2B1D' }}>Gunluk Ozet</p>
            <p className="text-sm text-gray-700">{seciliGunOzeti}</p>
          </div>
        )}
        {!seciliGunOzeti && seciliRapor == null && (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400">
            Secili tarihe ait rapor bulunmuyor.
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">Son Kayitlar</p>
          <span className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-500">
            {raporlar.length} kayit
          </span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRangeKey(opt.key)}
                className="px-3 py-2 rounded-lg text-xs font-medium border"
                style={rangeKey === opt.key
                  ? { backgroundColor: '#CC2B1D', color: '#fff', borderColor: '#CC2B1D' }
                  : { backgroundColor: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Karsilastirma</p>
            <p className="text-[11px] text-gray-400">
              {chartData.currentRange.from.toISOString().slice(0, 10)} - {chartData.currentRange.to.toISOString().slice(0, 10)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-400 mb-1">Pres Toplam</p>
              <p className="text-sm font-semibold text-gray-800">{formatKg(chartData.currentPres)}</p>
              <p className="text-[11px] mt-1" style={{ color: chartData.presChangePct == null ? '#9ca3af' : (chartData.presChangePct >= 0 ? '#16a34a' : '#dc2626') }}>
                {chartData.presChangePct == null ? 'Kiyas verisi yok' : `${chartData.presChangePct >= 0 ? '+' : ''}${chartData.presChangePct.toFixed(1)}%`}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-400 mb-1">Eloksal Toplam</p>
              <p className="text-sm font-semibold text-gray-800">{formatKg(chartData.currentEloksal)}</p>
              <p className="text-[11px] mt-1" style={{ color: chartData.eloksalChangePct == null ? '#9ca3af' : (chartData.eloksalChangePct >= 0 ? '#16a34a' : '#dc2626') }}>
                {chartData.eloksalChangePct == null ? 'Kiyas verisi yok' : `${chartData.eloksalChangePct >= 0 ? '+' : ''}${chartData.eloksalChangePct.toFixed(1)}%`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {lineChart.points.length === 0 ? (
              <div className="text-xs text-gray-400">Bu aralikta kayit yok.</div>
            ) : (
              <svg
                width={lineChart.width}
                height={lineChart.height}
                className="min-w-max"
                role="img"
                aria-label="Pres ve Eloksal cizgi grafigi"
              >
                <line x1="0" y1="124" x2={lineChart.width} y2="124" stroke="#e5e7eb" strokeWidth="1" />

                <polyline
                  fill="none"
                  stroke="#CC2B1D"
                  strokeWidth="2.5"
                  points={lineChart.presPolyline}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  fill="none"
                  stroke="#185FA5"
                  strokeWidth="2.5"
                  points={lineChart.eloksalPolyline}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {lineChart.points.map((p) => (
                  <g key={p.tarih}>
                    <circle cx={p.x} cy={p.presY} r="3" fill="#CC2B1D" />
                    <circle cx={p.x} cy={p.eloksalY} r="3" fill="#185FA5" />
                    <text x={p.x} y="148" textAnchor="middle" fontSize="10" fill="#9ca3af">
                      {p.tarih.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#CC2B1D' }} /> Pres</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#185FA5' }} /> Eloksal</span>
          </div>
        </div>

        {raporlar.length === 0 && (
          <p className="text-sm text-gray-400">Henuz uretim raporu yok.</p>
        )}

        <div className="space-y-2">
          {raporlar.map((r) => (
            <div key={r.tarih} className="rounded-xl border border-gray-200 p-3 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{r.tarih}</p>
                <p className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-500">Kayitli</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-gray-600">
                  Pres: <strong>{formatKg(r.presTon)}</strong>
                </div>
                <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-gray-600">
                  Eloksal: <strong>{formatKg(r.eloksalTon)}</strong>
                </div>
              </div>
              {r.not && <p className="mt-2 text-xs text-gray-500">{r.not}</p>}
            </div>
          ))}
        </div>
      </div>

      {aktifDetay === 'eloksal' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => e.target === e.currentTarget && setAktifDetay(null)}
        >
          <div className="bg-white w-full max-w-[430px] rounded-t-2xl p-5 safe-bottom space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Eloksal Detay</h3>
            <p className="text-sm text-gray-600">Mat bara sayisi: <strong>{Number(seciliEloksalDetay.matBaraSayisi || seciliEloksalDetay.matBarSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Renk bara sayisi: <strong>{Number(seciliEloksalDetay.renkBaraSayisi || seciliEloksalDetay.renkBarSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Yag alma bara sayisi: <strong>{Number(seciliEloksalDetay.yagAlmaBaraSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Toplam bara sayisi: <strong>{Number(seciliEloksalDetay.baraSayisi || seciliEloksalDetay.barSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Vardiya calisan kisi: <strong>{Number(seciliEloksalDetay.calisanKisiSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Ariza aciklamasi: <strong>{seciliEloksalDetay.arizaNotu || '-'}</strong></p>
            <button onClick={() => setAktifDetay(null)} className="w-full mt-2 py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#CC2B1D' }}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {aktifDetay === 'pres' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => e.target === e.currentTarget && setAktifDetay(null)}
        >
          <div className="bg-white w-full max-w-[430px] rounded-t-2xl p-5 safe-bottom space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Pres Detay</h3>
            <p className="text-sm text-gray-600">Calisan pres sayisi: <strong>{Number(seciliPresDetay.calisanPresSayisi || 0)}</strong></p>
            <p className="text-sm text-gray-600">Pres 1: <strong>{formatKg(seciliPresDetay.pres1Kg || 0)}</strong></p>
            <p className="text-sm text-gray-600">Pres 2: <strong>{formatKg(seciliPresDetay.pres2Kg || 0)}</strong></p>
            <p className="text-sm text-gray-600">Pres 1 fire: <strong>{formatPct(seciliPresDetay.pres1FiresiPct ?? seciliPresDetay.presFiresiPct ?? 0)}</strong></p>
            <p className="text-sm text-gray-600">Pres 2 fire: <strong>{formatPct(seciliPresDetay.pres2FiresiPct ?? seciliPresDetay.presFiresiPct ?? 0)}</strong></p>
            <p className="text-sm text-gray-600">Ariza aciklamasi: <strong>{seciliPresDetay.arizaNotu || '-'}</strong></p>
            <button onClick={() => setAktifDetay(null)} className="w-full mt-2 py-2.5 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: '#CC2B1D' }}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
