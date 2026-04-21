import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UlkeSecici from '../components/UlkeSecici'
import FirmaKart from '../components/FirmaKart'
import { claudeSearch } from '../utils/search'
import { firmaKaydet, isKayitli } from '../utils/storage'

export default function Ara() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [ulke, setUlke] = useState(null)
  const [loading, setLoading] = useState(false)
  const [firmalar, setFirmalar] = useState([])
  const [hata, setHata] = useState('')
  const [aramaYapildi, setAramaYapildi] = useState(false)
  const [yuklenenSayi, setYuklenenSayi] = useState(0)
  const [toplamSayi, setToplamSayi] = useState(0)

  async function handleAra() {
    if (!keyword.trim()) { setHata('Anahtar kelime girin'); return }
    if (!ulke) { setHata('Ülke seçin'); return }
    setHata('')
    setLoading(true)
    setAramaYapildi(true)
    setFirmalar([])
    setYuklenenSayi(0)
    setToplamSayi(0)

    try {
      await claudeSearch(
        keyword.trim(),
        ulke.tr,
        ulke.en,
        // Firma linkleri hazır olunca
        (firma) => {
          setYuklenenSayi(prev => prev + 1)
          setFirmalar(prev => prev.map((f, i) =>
            i === firma.idx ? { ...firma, kayitli: isKayitli(firma.url), yukleniyor: false } : f
          ))
        },
        // Firma adı ilk geldiğinde (placeholder)
        ({ name, snippet, idx }) => {
          setLoading(false)
          setToplamSayi(prev => {
            const yeni = prev + 1
            return yeni
          })
          setFirmalar(prev => {
            const yeni = [...prev]
            yeni[idx] = { name, snippet, yukleniyor: true, analiz: null }
            return yeni
          })
        }
      )
    } catch (e) {
      setHata('Hata: ' + (e.message || 'Bilinmeyen hata'))
      setLoading(false)
    }
  }

  function handleUygun(firma) {
    firmaKaydet({ ...firma, keyword, ulke: ulke?.tr, ulkeEn: ulke?.en, ulkeFlag: ulke?.flag })
    setFirmalar(prev => prev.map(f =>
      f.name === firma.name ? { ...f, kayitli: true, analiz: true } : f
    ))
  }

  function handleDegil(idx) {
    setFirmalar(prev => prev.filter((_, i) => i !== idx))
  }

  const araButonMetni = keyword || ulke
    ? `🔍 Ara${keyword ? ' — ' + keyword : ''}${ulke ? ' / ' + ulke.tr : ''}`
    : '🔍 Ara'

  const hepsiBitti = !loading && yuklenenSayi > 0 && yuklenenSayi >= toplamSayi

  return (
    <div className="flex flex-col min-h-screen bg-white safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-gray-100">
        <button onClick={() => navigate('/menu')} className="p-1 -ml-1">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <img src="/turkal-logo.png" alt="Turkal" className="h-9 w-auto object-contain" draggable={false} />
        <h1 className="font-semibold text-gray-800 text-sm">Yeni Müşteri Ara</h1>
      </div>

      {/* Form */}
      <div className="px-5 pt-5 pb-4 space-y-4 border-b border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Anahtar Kelime</label>
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAra()}
            placeholder="tile trim, aluminium extrusion buyer..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Ülke</label>
          <UlkeSecici selected={ulke} onSelect={setUlke} />
        </div>

        {hata && <p className="text-xs text-red-500">{hata}</p>}

        <button
          onClick={handleAra}
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: '#CC2B1D' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Claude analiz ediyor...
            </span>
          ) : araButonMetni}
        </button>
      </div>

      {/* Sonuçlar */}
      <div className="flex-1 px-5 py-4">
        {/* Progress bar */}
        {toplamSayi > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400">
                {hepsiBitti
                  ? `${toplamSayi} firma bulundu`
                  : `${yuklenenSayi} / ${toplamSayi} firma yüklendi...`
                }
              </p>
              {!hepsiBitti && (
                <button
                  onClick={() => navigate('/kaydedilenler')}
                  className="text-xs font-medium"
                  style={{ color: '#CC2B1D' }}
                >
                  Kaydedilenler →
                </button>
              )}
              {hepsiBitti && (
                <button
                  onClick={() => navigate('/kaydedilenler')}
                  className="text-xs font-medium"
                  style={{ color: '#CC2B1D' }}
                >
                  Kaydedilenler →
                </button>
              )}
            </div>
            {!hepsiBitti && (
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: '#CC2B1D',
                    width: `${toplamSayi > 0 ? (yuklenenSayi / toplamSayi) * 100 : 0}%`
                  }}
                />
              </div>
            )}
          </div>
        )}

        {aramaYapildi && !loading && firmalar.length === 0 && !hata && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Sonuç bulunamadı</p>
          </div>
        )}

        <div className="space-y-3">
          {firmalar.map((firma, idx) => firma && (
            <FirmaKart
              key={idx}
              firma={firma}
              ulke={ulke}
              onUygun={handleUygun}
              onDegil={() => handleDegil(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
