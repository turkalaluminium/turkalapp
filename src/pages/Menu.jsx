import { useNavigate } from 'react-router-dom'
import LmeFiyat from '../components/LmeFiyat'
import { getAuthSession, logout, ROLE_LABELS, ROLES } from '../utils/auth'

function TurkalLogo() {
  return (
    <img
      src="/turkal-logo.png"
      alt="Turkal Aluminium"
      style={{ width: '60%', maxWidth: '260px', height: 'auto' }}
      className="object-contain"
      draggable={false}
    />
  )
}

export default function Menu() {
  const navigate = useNavigate()
  const session = getAuthSession()
  const role = session?.role

  function cikisYap() {
    logout()
    navigate('/giris', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-white px-5 safe-top safe-bottom">
      {/* Header */}
      <div className="pt-10 pb-4">
        <TurkalLogo />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-gray-400 text-xs">Ihracat yonetim paneli</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-1 rounded-md bg-gray-100 text-gray-500">
              {ROLE_LABELS[role] || 'Rol'}
            </span>
            <button
              onClick={cikisYap}
              className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-500 bg-white"
            >
              Cikis
            </button>
          </div>
        </div>
      </div>

      {/* LME Alüminyum canlı fiyat */}
      <div className="mb-4">
        <LmeFiyat />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4 flex-1">
        {(role === ROLES.PATRON || role === ROLES.SATIS) && (
          <>
            {/* Fiyatlandirma */}
            <button
              onClick={() => navigate('/fiyatlandirma')}
              className="w-full text-left p-5 rounded-xl border border-gray-200 bg-white active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                  💰
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-base">Fiyatlandirma</p>
                  <p className="text-gray-400 text-sm mt-0.5">Fiyat listesi ve hesaplama</p>
                </div>
              </div>
            </button>

            {/* Teknik Cizimler */}
            <button
              onClick={() => navigate('/kalip-teknik-cizim')}
              className="w-full text-left p-5 rounded-xl border border-gray-200 bg-white active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                  📐
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-base">Teknik Cizimler</p>
                  <p className="text-gray-400 text-sm mt-0.5">Cizim dosyalarini listele ve goruntule</p>
                </div>
              </div>
            </button>
          </>
        )}

        {role === ROLES.PATRON && (
          <button
            onClick={() => navigate('/uretim-raporlari')}
            className="w-full text-left p-5 rounded-xl border-2 bg-white active:bg-red-50 transition-colors"
            style={{ borderColor: '#F1C5C1' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#FDECEA' }}>
                🏭
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Uretim Raporlari</p>
                <p className="text-gray-400 text-sm mt-0.5">Patron gorunumu</p>
              </div>
            </div>
          </button>
        )}

        {role === ROLES.PATRON && (
          <button
            onClick={() => navigate('/guncel-siparisler')}
            className="w-full text-left p-5 rounded-xl border-2 bg-white active:bg-red-50 transition-colors"
            style={{ borderColor: '#F1C5C1' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#FDECEA' }}>
                📦
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Guncel Siparisler</p>
                <p className="text-gray-400 text-sm mt-0.5">Tum siparis durumlarini takip et</p>
              </div>
            </div>
          </button>
        )}

        {role === ROLES.OPERATOR && (
          <button
            onClick={() => navigate('/uretim-rapor-girisi')}
            className="w-full text-left p-5 rounded-xl border-2 bg-white active:bg-red-50 transition-colors"
            style={{ borderColor: '#F1C5C1' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#FDECEA' }}>
                ✍️
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Uretim Rapor Girisi</p>
                <p className="text-gray-400 text-sm mt-0.5">Operator veri giris ekrani</p>
              </div>
            </div>
          </button>
        )}

        {role === ROLES.OPERATOR && (
          <button
            onClick={() => navigate('/presteki-siparis-girisi')}
            className="w-full text-left p-5 rounded-xl border-2 bg-white active:bg-red-50 transition-colors"
            style={{ borderColor: '#F1C5C1' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#FDECEA' }}>
                ⚙️
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Henuz Preste Basilmamis Siparis Kg</p>
                <p className="text-gray-400 text-sm mt-0.5">Henuz preste basilmamis siparis kg degerini kaydet</p>
              </div>
            </div>
          </button>
        )}

        {role === ROLES.OPERATOR && (
          <button
            onClick={() => navigate('/guncel-siparis-durum-girisi')}
            className="w-full text-left p-5 rounded-xl border-2 bg-white active:bg-red-50 transition-colors"
            style={{ borderColor: '#F1C5C1' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#FDECEA' }}>
                🧾
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Guncel Siparisler Durum Girisleri</p>
                <p className="text-gray-400 text-sm mt-0.5">Siparis durumunu gir ve guncelle</p>
              </div>
            </div>
          </button>
        )}

      </div>

      <div className="pb-8 pt-4">
        <p className="text-center text-gray-300 text-xs">turkal.com</p>
      </div>
    </div>
  )
}
