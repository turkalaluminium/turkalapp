import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKaydedilenler, firmaSil, firmaDurumGuncelle } from '../utils/storage'
import MailModal from '../components/MailModal'

const DURUM_STYLE = {
  Yeni: { bg: '#F3F4F6', text: '#6B7280' },
  Contacted: { bg: '#FDECEA', text: '#CC2B1D' },
  Replied: { bg: '#EFF6E8', text: '#3B6D11' },
}

export default function Kaydedilenler() {
  const navigate = useNavigate()
  const [firmalar, setFirmalar] = useState(() => getKaydedilenler())
  const [mailFirma, setMailFirma] = useState(null)
  const [silOnay, setSilOnay] = useState(null)

  function handleSil(id) {
    firmaSil(id)
    setFirmalar(getKaydedilenler())
    setSilOnay(null)
  }

  function handleDurumDegistir(id, durum) {
    firmaDurumGuncelle(id, durum)
    setFirmalar(getKaydedilenler())
  }

  function handleMailSent(firma) {
    firmaDurumGuncelle(firma.id, 'Contacted')
    setFirmalar(getKaydedilenler())
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
        <div className="flex-1">
          <h1 className="font-semibold text-gray-800 text-sm">Kaydedilen Firmalar</h1>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {firmalar.length}
        </span>
      </div>

      {/* Liste */}
      <div className="flex-1 px-5 py-4">
        {firmalar.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-4xl">📋</p>
            <p className="text-gray-400 text-sm text-center">Henüz kayıtlı firma yok.<br/>Arama yaparak firma kaydedin.</p>
            <button
              onClick={() => navigate('/ara')}
              className="mt-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: '#CC2B1D' }}
            >
              Firma Ara
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {firmalar.map(firma => {
              const durum = firma.durum || 'Yeni'
              const durumStyle = DURUM_STYLE[durum] || DURUM_STYLE.Yeni

              return (
                <div key={firma.id} className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    {/* Flag */}
                    <span className="text-xl flex-shrink-0 mt-0.5">{firma.ulkeFlag || '🏳️'}</span>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={firma.url}
                          target="_blank"
                          rel="noopener noreferrer"
            className="font-semibold text-sm flex items-center gap-1 truncate"
                        style={{ color: '#CC2B1D' }}
                        >
                          <span className="truncate">{firma.name}</span>
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        {/* Durum badge */}
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: durumStyle.bg, color: durumStyle.text }}
                        >
                          {durum}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mt-0.5">
                        {firma.ulke} {firma.keyword ? `• ${firma.keyword}` : ''}
                      </p>
                      {firma.snippet && (
                        <p className="text-xs text-gray-300 mt-1 line-clamp-2">{firma.snippet}</p>
                      )}

                      {/* Aksiyon butonları */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setMailFirma(firma)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white"
                          style={{ backgroundColor: '#CC2B1D' }}
                        >
                          ✉️ Mail
                        </button>

                        {durum !== 'Replied' && (
                          <button
                            onClick={() => handleDurumDegistir(firma.id, durum === 'Yeni' ? 'Contacted' : 'Replied')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500"
                          >
                            {durum === 'Yeni' ? '→ Contacted' : '→ Replied'}
                          </button>
                        )}

                        <button
                          onClick={() => setSilOnay(firma.id)}
                          className="ml-auto px-2.5 py-1.5 rounded-lg text-xs border border-red-100 text-red-400"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Silme onay modal */}
      {silOnay !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSilOnay(null)}
        >
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-gray-800 text-base mb-1">Firmayı sil?</p>
            <p className="text-gray-400 text-sm mb-5">Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button onClick={() => setSilOnay(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm">İptal</button>
              <button onClick={() => handleSil(silOnay)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Mail modal */}
      {mailFirma && (
        <MailModal
          firma={mailFirma}
          onClose={() => setMailFirma(null)}
          onSent={() => handleMailSent(mailFirma)}
        />
      )}
    </div>
  )
}
