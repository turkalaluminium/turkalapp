import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

export default function KalipTeknikCizim() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cizimler, setCizimler] = useState([])
  const [cizimLoading, setCizimLoading] = useState(false)
  const [cizimError, setCizimError] = useState('')
  const [seciliCizimId, setSeciliCizimId] = useState(null)
  const [gosterilenCizimId, setGosterilenCizimId] = useState(null)

  useEffect(() => {
    let aktif = true
    setCizimLoading(true)
    setCizimError('')

    fetch(apiUrl('/api/technical-drawings'))
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!aktif) return
        const items = Array.isArray(data.items) ? data.items : []
        setCizimler(items)
        if (!seciliCizimId && items[0]?.id) setSeciliCizimId(items[0].id)
      })
      .catch((err) => {
        if (!aktif) return
        setCizimError(err.message || 'Cizimler yuklenemedi')
      })
      .finally(() => {
        if (aktif) setCizimLoading(false)
      })

    return () => { aktif = false }
  }, [seciliCizimId])

  const filtreli = useMemo(() => {
    const aranan = q.trim().toLowerCase()
    if (!aranan) return cizimler
    return cizimler.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(aranan)
    )
  }, [cizimler, q])

  const gosterilenCizim = useMemo(
    () => cizimler.find((x) => x.id === gosterilenCizimId) || null,
    [cizimler, gosterilenCizimId]
  )

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
          <h1 className="font-semibold text-gray-800 text-sm">Teknik Cizimler</h1>
          <p className="text-xs text-gray-400">Uretim ve teklif oncesi cizim arsivi</p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cizim kodu veya dosya adı ara"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
        />
      </div>

      <div className="flex-1 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{cizimler.length} teknik cizim yuklendi</span>
          <button
            type="button"
            onClick={() => {
              if (!seciliCizimId) return
              setGosterilenCizimId(seciliCizimId)
            }}
            disabled={!seciliCizimId}
            className="px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: '#CC2B1D' }}
          >
            Sectigimi goster
          </button>
        </div>

        {filtreli.length === 0 && !cizimLoading && (
          <p className="text-sm text-gray-400 text-center py-8">Sonuc bulunamadı</p>
        )}

        {cizimLoading && (
          <p className="text-sm text-gray-400">Teknik cizimler yukleniyor...</p>
        )}
        {cizimError && (
          <p className="text-sm text-red-500">{cizimError}</p>
        )}

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="max-h-[38vh] overflow-y-auto divide-y divide-gray-100 bg-white">
            {filtreli.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSeciliCizimId(c.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
                style={seciliCizimId === c.id ? { backgroundColor: '#FDECEA' } : undefined}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate">{c.relativePath}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {!gosterilenCizim && (
            <div className="p-6 text-center text-sm text-gray-400">
              Listeden bir cizim secip <strong>Sectigimi goster</strong> butonuna bas.
            </div>
          )}

          {gosterilenCizim && gosterilenCizim.canPreview && (
            <iframe
              title={gosterilenCizim.name}
              src={apiUrl(`/api/technical-drawings/${encodeURIComponent(gosterilenCizim.id)}/file`)}
              className="w-full h-[48vh]"
            />
          )}

          {gosterilenCizim && !gosterilenCizim.canPreview && (
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-3">
                Bu format tarayicida onizlenemiyor ({gosterilenCizim.extension.toUpperCase()}).
              </p>
              <a
                href={apiUrl(`/api/technical-drawings/${encodeURIComponent(gosterilenCizim.id)}/file`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#CC2B1D' }}
              >
                Yeni sekmede ac
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
