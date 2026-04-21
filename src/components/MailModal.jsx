import { useState } from 'react'
import { firmaDurumGuncelle, firmaKaydet } from '../utils/storage'
import { apiUrl } from '../utils/api'

const MAIL_KONU = 'Aluminium Extrusion Profiles — Turkal Aluminium, Turkey'
const MAIL_BODY = `Dear Team,

We are Turkal Aluminium, a Turkish aluminium extrusion profile manufacturer with 100% export focus.

Monthly capacity: 180 tons
Certifications: [to be added]
Products: Aluminium extrusion profiles for all industries

We would be happy to discuss potential cooperation.

Best regards,
Turkal Aluminium
o.aksoy@turkalprofiles.com
www.turkal.com.tr`

export default function MailModal({ firma, onClose, onSent, ulke }) {
  const [alici, setAlici] = useState('')
  const [gondering, setGondering] = useState(false)
  const [sonuc, setSonuc] = useState(null)
  const [hata, setHata] = useState('')

  async function handleGonder() {
    if (!alici.trim()) { setHata('Mail adresi girin'); return }
    setHata('')
    setGondering(true)

    try {
      const res = await fetch(apiUrl('/api/send-mail'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: alici.trim(),
          subject: MAIL_KONU,
          body: MAIL_BODY,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Gönderilemedi')

      setSonuc('ok')
      durumGuncelle()
      setTimeout(() => { onSent?.(); onClose() }, 1800)
    } catch (e) {
      setHata('Hata: ' + e.message)
      setSonuc('hata')
    } finally {
      setGondering(false)
    }
  }

  function durumGuncelle() {
    if (firma?.id) {
      firmaDurumGuncelle(firma.id, 'Contacted')
    } else if (firma && ulke) {
      const kaydedilen = firmaKaydet({
        ...firma,
        ulke: ulke?.tr,
        ulkeEn: ulke?.en,
        ulkeFlag: ulke?.flag,
      })
      if (kaydedilen?.id) firmaDurumGuncelle(kaydedilen.id, 'Contacted')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-[430px] rounded-t-2xl p-5 safe-bottom">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {sonuc === 'ok' ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: '#EFF6E8' }}>
              ✅
            </div>
            <p className="font-semibold text-gray-800">Mail gönderildi!</p>
            <p className="text-xs text-gray-400">{alici}</p>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-800 text-base mb-0.5">Mail Gönder</h3>
            <p className="text-gray-400 text-xs mb-4">{firma?.name}</p>

            <label className="block text-xs font-medium text-gray-500 mb-1.5">Alıcı Mail</label>
            <input
              type="email"
              value={alici}
              onChange={e => setAlici(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGonder()}
              placeholder="ornek@firma.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 mb-4"
              autoCapitalize="none"
              autoCorrect="off"
            />

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-400 mb-1">Konu:</p>
              <p className="text-xs text-gray-600 mb-3">{MAIL_KONU}</p>
              <p className="text-xs font-medium text-gray-400 mb-1">İçerik:</p>
              <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-4">{MAIL_BODY}</p>
            </div>

            {hata && <p className="text-xs text-red-500 mb-3">{hata}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleGonder}
                disabled={gondering}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: '#CC2B1D' }}
              >
                {gondering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Gönderiliyor...
                  </span>
                ) : '✉️ Gönder'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
