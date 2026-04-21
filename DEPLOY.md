# Turkal App Deploy (Railway + Vercel)

Bu proje icin en hizli ve stabil yapi:
- Frontend: Vercel
- Backend API: Railway

## 0) On Hazirlik (bir kere)

1. Projeyi GitHub'a push et.
2. `main` branch guncel olsun.
3. `.env` dosyasini repoya koyma, sadece platformlara gir.

## 1) Backend'i Railway'e al

1. Railway'de `New Project` -> `Deploy from GitHub repo`
2. Bu repoyu sec
3. Service ayarinda root'u `backend` olarak sec
4. Start command: `node server.js`
5. Deploy tamamlaninca URL'i al:
   - Ornek: `https://turkal-backend-production.up.railway.app`
6. `Variables` bolumune su degerleri gir:
   - `SMTP_HOST`
   - `SMTP_PORT` (genelde `465`)
   - `SMTP_USER`
   - `SMTP_PASS`
   - `CLAUDE_API_KEY`
   - `SERPER_API_KEY`
   - `CORS_ALLOWED_ORIGINS` (simdilik bos birakabilirsin)
   - `CORS_ALLOW_VERCEL_PREVIEWS=true`
   - `PRODUCTION_REPORTS_FILE=/data/production-reports.json`
   - `CURRENT_ORDERS_FILE=/data/current-orders.json`
7. Hemen test:
   - `https://...railway.app/health` -> `{ "ok": true }`

## 2) Frontend'i Vercel'e al

1. Vercel'de `Add New Project`
2. Ayni GitHub reposunu sec
3. Build Vite olarak otomatik gelir (`vite build`)
4. `Environment Variables` ekle:
   - `VITE_API_URL=https://...railway.app`
5. Deploy et
6. Frontend URL'ini al:
   - Ornek: `https://turkal-app.vercel.app`

## 3) CORS'i tamamla (Railway)

Railway `Variables` icinde:
- `CORS_ALLOWED_ORIGINS=https://turkal-app.vercel.app`
- Birden fazla domain varsa virgulle ekle
- `CORS_ALLOW_VERCEL_PREVIEWS=true` kalsin

Sonra Railway'de redeploy yap.

## 4) Canli test checklist

- Frontend aciliyor mu?
- Giris yapiliyor mu?
- `Guncel Siparis` kayit/guncelleme calisiyor mu?
- `Uretim Rapor` kaydetme ve patron gorunumu calisiyor mu?
- `Teknik Cizimler` aciliyor mu?
- `LME` geliyor mu?
- `Musteri Arama` (Claude/Serper) cevap veriyor mu?

## 5) Guvenlik (zorunlu)

Canliya cikmadan once asagidakileri yenile:
- `SMTP_PASS`
- `CLAUDE_API_KEY`
- `SERPER_API_KEY`

## Notlar

- Frontend API cagrilari `VITE_API_URL` uzerinden backend'e gider.
- Railway kapanmaz, tuncel link sorunu olmaz (tunel kullanmaya gore).
