import { useState } from 'react'
import { ULKELER } from '../utils/ulkeler'

export default function UlkeSecici({ selected, onSelect }) {
  const [open, setOpen] = useState(false)
  const [gecici, setGecici] = useState(selected)

  function handleAc() {
    setGecici(selected)
    setOpen(true)
  }

  function handleTamam() {
    onSelect(gecici)
    setOpen(false)
  }

  function handleTemizle() {
    setGecici(null)
  }

  return (
    <>
      {/* Seç butonu */}
      <button
        type="button"
        onClick={handleAc}
        className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-white text-sm text-left"
      >
        {selected ? (
          <span className="flex items-center gap-2 text-gray-800">
            <span className="text-lg">{selected.flag}</span>
            <span className="font-medium">{selected.tr}</span>
          </span>
        ) : (
          <span className="text-gray-300">Ülke seç...</span>
        )}
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white w-full max-w-[430px] rounded-t-2xl safe-bottom flex flex-col" style={{ maxHeight: '80dvh' }}>
            {/* Handle */}
            <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Başlık */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-base">Ülke Seç</h3>
              {gecici && (
                <button onClick={handleTemizle} className="text-xs text-gray-400 underline">
                  Temizle
                </button>
              )}
            </div>

            {/* Liste */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              <div className="space-y-1">
                {ULKELER.map(ulke => {
                  const isSelected = gecici?.en === ulke.en
                  return (
                    <button
                      key={ulke.en}
                      onClick={() => setGecici(ulke)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
                      style={
                        isSelected
                          ? { backgroundColor: '#FDECEA' }
                          : { backgroundColor: 'transparent' }
                      }
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-2xl">{ulke.flag}</span>
                        <span
                          className={`text-sm ${isSelected ? 'font-semibold' : 'text-gray-700'}`}
                          style={isSelected ? { color: '#CC2B1D' } : {}}
                        >
                          {ulke.tr}
                        </span>
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#CC2B1D' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tamam butonu */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleTamam}
                disabled={!gecici}
                className="w-full py-3.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: '#CC2B1D' }}
              >
                {gecici ? `${gecici.flag} ${gecici.tr} — Tamam` : 'Tamam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
