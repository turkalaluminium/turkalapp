import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Splash from './pages/Splash'
import Giris from './pages/Giris'
import Menu from './pages/Menu'
import Fiyatlandirma from './pages/Fiyatlandirma'
import KalipTeknikCizim from './pages/KalipTeknikCizim'
import UretimRaporlari from './pages/UretimRaporlari'
import UretimRaporGirisi from './pages/UretimRaporGirisi'
import GuncelSiparisler from './pages/GuncelSiparisler'
import GuncelSiparisDurumGirisi from './pages/GuncelSiparisDurumGirisi'
import RequireRole from './components/RequireRole'
import { ROLES } from './utils/auth'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/giris" element={<Giris />} />
          <Route path="/menu" element={<RequireRole><Menu /></RequireRole>} />
          <Route path="/ara" element={<Navigate to="/menu" replace />} />
          <Route path="/kaydedilenler" element={<Navigate to="/menu" replace />} />
          <Route path="/fiyatlandirma" element={<RequireRole roles={[ROLES.PATRON, ROLES.SATIS]}><Fiyatlandirma /></RequireRole>} />
          <Route path="/kalip-teknik-cizim" element={<RequireRole roles={[ROLES.PATRON, ROLES.SATIS]}><KalipTeknikCizim /></RequireRole>} />
          <Route path="/uretim-raporlari" element={<RequireRole roles={[ROLES.PATRON]}><UretimRaporlari /></RequireRole>} />
          <Route path="/uretim-rapor-girisi" element={<RequireRole roles={[ROLES.OPERATOR]}><UretimRaporGirisi /></RequireRole>} />
          <Route path="/guncel-siparisler" element={<RequireRole roles={[ROLES.PATRON]}><GuncelSiparisler /></RequireRole>} />
          <Route path="/guncel-siparis-durum-girisi" element={<RequireRole roles={[ROLES.OPERATOR]}><GuncelSiparisDurumGirisi /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
