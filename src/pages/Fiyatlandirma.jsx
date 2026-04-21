import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const KAPLAMALAR = [
  { en: 'Mill Finish',           tr: 'Mill Finish',              carpan: 0.92, renk: '#9e9e9e', bg: '#f5f5f5', border: '#ddd' },
  { en: 'Matt Silver Anodized',  tr: 'Mat Gümüş Anodize',        carpan: 1.00, renk: '#5580a0', bg: '#dce9f2', border: '#a8c4d8' },
  { en: 'Matt Gold Anodized',    tr: 'Mat Altın Anodize',         carpan: 1.05, renk: '#8a6200', bg: '#f7e9b8', border: '#d4a830' },
  { en: 'Matt Black Anodized',   tr: 'Mat Siyah Anodize',         carpan: 1.25, renk: '#fff',    bg: '#3a3a3a', border: '#222', dark: true },
  { en: 'Shiny Silver Anodized', tr: 'Parlak Gümüş Anodize',      carpan: 1.30, renk: '#1a3a55', bg: '#e8f2fa', border: '#7aaacf' },
  { en: 'Shiny Gold Anodized',   tr: 'Parlak Altın Anodize',      carpan: 1.30, renk: '#4a3100', bg: '#fff2b0', border: '#e5b800' },
  { en: 'Shiny Black Anodized',  tr: 'Parlak Siyah Anodize',      carpan: 1.30, renk: '#eee',    bg: '#1a1a1a', border: '#444',  dark: true },
]

function hesapla({ gramaj, uzunluk, bazFiyat, delikli }) {
  const gramajKg = parseFloat(gramaj) / 1000
  const uz = parseFloat(uzunluk)
  const baz = parseFloat(bazFiyat)
  const delikKatsayi = delikli ? 0.86 : 1.0

  const mattSilverBaz = gramajKg * uz * delikKatsayi * baz

  return {
    mattSilverBaz,
    kaplamalar: KAPLAMALAR.map(k => ({
      ...k,
      fiyat: mattSilverBaz * k.carpan,
    })),
  }
}

export default function Fiyatlandirma() {
  const navigate = useNavigate()
  const [gramaj, setGramaj] = useState('')
  const [uzunluk, setUzunluk] = useState('')
  const [bazFiyat, setBazFiyat] = useState('8')
  const [delikli, setDelikli] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  function handleHesapla() {
    if (!gramaj || !uzunluk || !bazFiyat) {
      setHata('Lütfen tüm alanları doldurun')
      return
    }
    if (parseFloat(gramaj) <= 0 || parseFloat(uzunluk) <= 0 || parseFloat(bazFiyat) <= 0) {
      setHata('Değerler sıfırdan büyük olmalı')
      return
    }
    setHata('')
    setSonuc(hesapla({ gramaj, uzunluk, bazFiyat, delikli }))
  }

  function handleSifirla() {
    setGramaj('')
    setUzunluk('')
    setBazFiyat('8')
    setDelikli(false)
    setSonuc(null)
    setHata('')
  }

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
        <div>
          <h1 className="font-semibold text-gray-800 text-sm">Fiyat Hesaplama</h1>
          <p className="text-xs text-gray-400">Kaplama türüne göre birim fiyat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Form */}
        <div className="px-5 pt-5 pb-4 space-y-4">

          {/* Gramaj + Uzunluk yan yana */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Gramaj <span className="text-gray-300 font-normal">(g/m)</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={gramaj}
                onChange={e => setGramaj(e.target.value)}
                placeholder="örn: 65"
                step="0.1"
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Uzunluk <span className="text-gray-300 font-normal">(m)</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={uzunluk}
                onChange={e => setUzunluk(e.target.value)}
                placeholder="örn: 6"
                step="0.01"
                min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Baz fiyat */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Baz Fiyat <span className="text-gray-300 font-normal">($/kg)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={bazFiyat}
              onChange={e => setBazFiyat(e.target.value)}
              placeholder="8.00"
              step="0.01"
              min="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* Delik durumu */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Delik Durumu</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setDelikli(false)}
                className="flex-1 py-3 text-sm font-medium transition-colors"
                style={!delikli
                  ? { backgroundColor: '#CC2B1D', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#9ca3af' }
                }
              >
                Deliksiz
              </button>
              <button
                type="button"
                onClick={() => setDelikli(true)}
                className="flex-1 py-3 text-sm font-medium transition-colors border-l border-gray-200"
                style={delikli
                  ? { backgroundColor: '#CC2B1D', color: '#fff' }
                  : { backgroundColor: '#fff', color: '#9ca3af' }
                }
              >
                Delikli
              </button>
            </div>
          </div>

          {hata && <p className="text-xs text-red-500">{hata}</p>}

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              onClick={handleSifirla}
              className="flex-none px-5 py-3.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
            >
              Sıfırla
            </button>
            <button
              onClick={handleHesapla}
              className="flex-1 py-3.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#CC2B1D' }}
            >
              Fiyat Hesapla
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        {sonuc && (
          <div className="px-5 pb-8 space-y-4">
            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <p className="text-xs text-gray-300 flex-shrink-0">Hesaplama Sonuçları</p>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Baz fiyat banner */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FDECEA' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: '#CC2B1D' }}>Mat Gümüş Anodize — Baz Fiyat</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {delikli ? 'Delikli: ×0.86 indirim uygulandı' : 'Deliksiz profil'}
                  </p>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#CC2B1D' }}>
                  ${sonuc.mattSilverBaz.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Kaplama kartları */}
            <p className="text-xs font-medium text-gray-400">Tüm Kaplama Türleri</p>
            <div className="grid grid-cols-2 gap-2.5">
              {sonuc.kaplamalar.map(k => (
                <div
                  key={k.en}
                  className="rounded-xl p-3.5 border"
                  style={{ backgroundColor: k.bg, borderColor: k.border }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: k.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        color: k.dark ? '#ccc' : '#666'
                      }}
                    >
                      ×{k.carpan.toFixed(2)}
                    </span>
                  </div>
                  <p
                    className="text-xs font-semibold leading-tight mb-1"
                    style={{ color: k.renk }}
                  >
                    {k.tr}
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: k.renk }}
                  >
                    ${k.fiyat.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Hesap özeti */}
            <div className="rounded-xl border border-gray-100 p-4 bg-gray-50 space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-3">Hesaplama Özeti</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Gramaj</span>
                <span className="font-medium text-gray-700">{gramaj} g/m → {(parseFloat(gramaj)/1000).toFixed(4)} kg/m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Uzunluk</span>
                <span className="font-medium text-gray-700">{uzunluk} m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Baz Fiyat</span>
                <span className="font-medium text-gray-700">${bazFiyat}/kg</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Delik İndirimi</span>
                <span className="font-medium text-gray-700">{delikli ? '×0.86 (−14%)' : 'Yok'}</span>
              </div>
              <div className="h-px bg-gray-200 my-1" />
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">Formül</span>
                <span className="text-gray-400">
                  {(parseFloat(gramaj)/1000).toFixed(3)} × {uzunluk} × {delikli ? '0.86' : '1.00'} × {bazFiyat}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
