const path = require('path')
const fs = require('fs')
const envPaths = [path.resolve(__dirname, '.env'), path.resolve(__dirname, '../.env')]
const envPath = envPaths.find((p) => fs.existsSync(p))
if (envPath) require('dotenv').config({ path: envPath })
const express = require('express')
const nodemailer = require('nodemailer')
const cors = require('cors')

const app = express()
const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
const allowedOrigins = new Set([...defaultDevOrigins, ...configuredOrigins])
const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS === 'true'

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)
    if (allowVercelPreviews) {
      try {
        const hostname = new URL(origin).hostname
        if (hostname.endsWith('.vercel.app')) return callback(null, true)
      } catch {
        // Geçersiz origin formatı olursa CORS reddedilir.
      }
    }
    return callback(null, false)
  },
}))
app.use(express.json({ limit: '30mb' }))

function resolveDataFilePath({ envValue, fallbackFileName }) {
  const raw = String(envValue || '').trim()
  if (!raw) return resolvePersistentDefaultPath(fallbackFileName)

  if (path.isAbsolute(raw)) return raw

  // "backend/data/..." gibi eski relative değerleri normalize et.
  const normalized = raw.replace(/^\.?[\\/]/, '').replace(/^backend[\\/]/i, '')
  return path.join(__dirname, normalized)
}

function resolvePersistentDefaultPath(fileName) {
  const railwayDataRoot = '/data'
  if (process.env.RAILWAY_ENVIRONMENT || fs.existsSync(railwayDataRoot)) {
    return path.join(railwayDataRoot, fileName)
  }
  return path.join(__dirname, 'data', fileName)
}

// ============================================================
//  URETIM RAPORLARI — ortak veri kaynagi (patron sadece gorur)
// ============================================================

const PRODUCTION_REPORTS_FILE = path.resolve(resolveDataFilePath({
  envValue: process.env.PRODUCTION_REPORTS_FILE,
  fallbackFileName: 'production-reports.json',
}))
const PRODUCTION_REPORTS_WRITE_KEY = String(process.env.PRODUCTION_REPORTS_WRITE_KEY || '').trim()

function toNonNegativeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function readProductionReports() {
  try {
    if (!fs.existsSync(PRODUCTION_REPORTS_FILE)) return []
    const raw = fs.readFileSync(PRODUCTION_REPORTS_FILE, 'utf8')
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        tarih: String(x.tarih || ''),
        presTon: Number(x.presTon || 0),
        eloksalTon: Number(x.eloksalTon || 0),
        not: String(x.not || ''),
        guncellenme: String(x.guncellenme || ''),
        eloksalDetay: {
          baraSayisi: toNonNegativeNumber(x?.eloksalDetay?.baraSayisi ?? x?.eloksalDetay?.barSayisi ?? x?.eloksalDetay?.altmisBarKg),
          yagAlmaBaraSayisi: toNonNegativeNumber(x?.eloksalDetay?.yagAlmaBaraSayisi),
          matBaraSayisi: toNonNegativeNumber(x?.eloksalDetay?.matBaraSayisi ?? x?.eloksalDetay?.matBarSayisi ?? x?.eloksalDetay?.elliIkiBarMatKg),
          renkBaraSayisi: toNonNegativeNumber(x?.eloksalDetay?.renkBaraSayisi ?? x?.eloksalDetay?.renkBarSayisi ?? x?.eloksalDetay?.sekizBarRenkKg),
          calisanKisiSayisi: toNonNegativeNumber(x?.eloksalDetay?.calisanKisiSayisi),
          arizaNotu: String(x?.eloksalDetay?.arizaNotu || ''),
        },
        presDetay: {
          calisanPresSayisi: toNonNegativeNumber(x?.presDetay?.calisanPresSayisi),
          pres1Kg: toNonNegativeNumber(x?.presDetay?.pres1Kg),
          pres2Kg: toNonNegativeNumber(x?.presDetay?.pres2Kg),
          pres3Kg: toNonNegativeNumber(x?.presDetay?.pres3Kg),
          pres1FiresiPct: Math.min(100, toNonNegativeNumber(x?.presDetay?.pres1FiresiPct ?? x?.presDetay?.presFiresiPct)),
          pres2FiresiPct: Math.min(100, toNonNegativeNumber(x?.presDetay?.pres2FiresiPct ?? x?.presDetay?.presFiresiPct)),
          arizaNotu: String(x?.presDetay?.arizaNotu || ''),
        },
      }))
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.tarih))
      .sort((a, b) => b.tarih.localeCompare(a.tarih))
  } catch (err) {
    console.error('Uretim raporu okuma hatasi:', err.message)
    return []
  }
}

function writeProductionReports(items) {
  const dir = path.dirname(PRODUCTION_REPORTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(PRODUCTION_REPORTS_FILE, JSON.stringify(items, null, 2), 'utf8')
}

app.get('/api/production-reports', (req, res) => {
  const reports = readProductionReports()
  res.json({
    total: reports.length,
    items: reports,
  })
})

app.post('/api/production-reports', (req, res) => {
  if (PRODUCTION_REPORTS_WRITE_KEY) {
    const key = String(req.headers['x-write-key'] || '')
    if (key !== PRODUCTION_REPORTS_WRITE_KEY) {
      return res.status(401).json({ error: 'Yetkisiz yazma istegi' })
    }
  }

  const { tarih, presTon, eloksalTon, not = '', eloksalDetay = {}, presDetay = {} } = req.body || {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(tarih || ''))) {
    return res.status(400).json({ error: 'tarih YYYY-MM-DD formatinda olmali' })
  }

  const p = Number(presTon)
  const e = Number(eloksalTon)
  if (!Number.isFinite(p) || !Number.isFinite(e) || p < 0 || e < 0) {
    return res.status(400).json({ error: 'presTon ve eloksalTon 0 veya buyuk olmali' })
  }

  const payload = {
    tarih: String(tarih),
    presTon: p,
    eloksalTon: e,
    not: String(not || '').trim(),
    eloksalDetay: {
      baraSayisi: toNonNegativeNumber(eloksalDetay.baraSayisi ?? eloksalDetay.barSayisi ?? eloksalDetay.altmisBarKg),
      yagAlmaBaraSayisi: toNonNegativeNumber(eloksalDetay.yagAlmaBaraSayisi),
      matBaraSayisi: toNonNegativeNumber(eloksalDetay.matBaraSayisi ?? eloksalDetay.matBarSayisi ?? eloksalDetay.elliIkiBarMatKg),
      renkBaraSayisi: toNonNegativeNumber(eloksalDetay.renkBaraSayisi ?? eloksalDetay.renkBarSayisi ?? eloksalDetay.sekizBarRenkKg),
      calisanKisiSayisi: toNonNegativeNumber(eloksalDetay.calisanKisiSayisi),
      arizaNotu: String(eloksalDetay.arizaNotu || '').trim(),
    },
    presDetay: {
      calisanPresSayisi: toNonNegativeNumber(presDetay.calisanPresSayisi),
      pres1Kg: toNonNegativeNumber(presDetay.pres1Kg),
      pres2Kg: toNonNegativeNumber(presDetay.pres2Kg),
      pres3Kg: toNonNegativeNumber(presDetay.pres3Kg),
      pres1FiresiPct: Math.min(100, toNonNegativeNumber(presDetay.pres1FiresiPct ?? presDetay.presFiresiPct)),
      pres2FiresiPct: Math.min(100, toNonNegativeNumber(presDetay.pres2FiresiPct ?? presDetay.presFiresiPct)),
      arizaNotu: String(presDetay.arizaNotu || '').trim(),
    },
    guncellenme: new Date().toISOString(),
  }

  const list = readProductionReports()
  const idx = list.findIndex((x) => x.tarih === payload.tarih)
  if (idx >= 0) list[idx] = { ...list[idx], ...payload }
  else list.unshift(payload)
  list.sort((a, b) => b.tarih.localeCompare(a.tarih))

  try {
    writeProductionReports(list)
    return res.json({ ok: true, item: payload, total: list.length })
  } catch (err) {
    console.error('Uretim raporu yazma hatasi:', err.message)
    return res.status(500).json({ error: 'Uretim raporu yazilamadi' })
  }
})

// ============================================================
//  GUNCEL SIPARISLER — patron izler, operator girer/gunceller
// ============================================================

const CURRENT_ORDERS_FILE = path.resolve(resolveDataFilePath({
  envValue: process.env.CURRENT_ORDERS_FILE,
  fallbackFileName: 'current-orders.json',
}))

function normalizeOrder(x) {
  const rawPct = Number(x?.ilerlemeYuzde ?? 0)
  const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0
  const rawKg = Number(x?.siparisKg ?? 0)
  const siparisKg = Number.isFinite(rawKg) && rawKg >= 0 ? rawKg : 0
  return {
    id: String(x?.id || '').trim(),
    ulke: String(x?.ulke || '').trim(),
    firma: String(x?.firma || '').trim(),
    siparisNo: String(x?.siparisNo || '').trim(),
    siparisAdi: String(x?.siparisAdi || '').trim(),
    siparisKg,
    ilerlemeYuzde: pct,
    gelisTarihi: String(x?.gelisTarihi || '').trim(),
    terminTarihi: String(x?.terminTarihi || '').trim(),
    tamamlanmaTarihi: String(x?.tamamlanmaTarihi || '').trim(),
    sevkEdildi: Boolean(x?.sevkEdildi),
    durumNotu: String(x?.durumNotu || '').trim(),
    guncellenme: String(x?.guncellenme || ''),
  }
}

function orderTitle(order) {
  return `${order.ulke}|${order.firma}|${order.siparisAdi}`.toLowerCase().trim()
}

function readCurrentOrders() {
  try {
    if (!fs.existsSync(CURRENT_ORDERS_FILE)) return []
    const raw = fs.readFileSync(CURRENT_ORDERS_FILE, 'utf8')
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeOrder)
      .filter((x) => x.ulke && x.firma && x.siparisAdi)
      .sort((a, b) => String(b.guncellenme || '').localeCompare(String(a.guncellenme || '')))
  } catch (err) {
    console.error('Guncel siparis okuma hatasi:', err.message)
    return []
  }
}

function writeCurrentOrders(items) {
  const dir = path.dirname(CURRENT_ORDERS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CURRENT_ORDERS_FILE, JSON.stringify(items, null, 2), 'utf8')
}

app.get('/api/current-orders', (req, res) => {
  const items = readCurrentOrders()
  res.json({ total: items.length, items })
})

app.post('/api/current-orders', (req, res) => {
  const payload = normalizeOrder(req.body || {})
  if (!payload.ulke || !payload.firma || !payload.siparisAdi) {
    return res.status(400).json({ error: 'ulke, firma ve siparisAdi zorunlu' })
  }
  if (payload.gelisTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(payload.gelisTarihi)) {
    return res.status(400).json({ error: 'gelisTarihi YYYY-MM-DD formatinda olmali' })
  }
  if (payload.terminTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(payload.terminTarihi)) {
    return res.status(400).json({ error: 'terminTarihi YYYY-MM-DD formatinda olmali' })
  }
  if (payload.tamamlanmaTarihi && !/^\d{4}-\d{2}-\d{2}$/.test(payload.tamamlanmaTarihi)) {
    return res.status(400).json({ error: 'tamamlanmaTarihi YYYY-MM-DD formatinda olmali' })
  }
  if (!Number.isFinite(Number(payload.siparisKg)) || Number(payload.siparisKg) < 0) {
    return res.status(400).json({ error: 'siparisKg 0 veya buyuk olmali' })
  }
  const now = new Date().toISOString()
  const isCompleted = payload.ilerlemeYuzde >= 100
  const finalItem = {
    ...payload,
    id: payload.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tamamlanmaTarihi: isCompleted ? (payload.tamamlanmaTarihi || now.slice(0, 10)) : payload.tamamlanmaTarihi,
    sevkEdildi: isCompleted ? Boolean(payload.sevkEdildi) : false,
    guncellenme: now,
  }

  const list = readCurrentOrders()
  const idxById = list.findIndex((x) => x.id === finalItem.id)
  if (idxById >= 0) list[idxById] = { ...list[idxById], ...finalItem }
  else list.unshift(finalItem)

  list.sort((a, b) => String(b.guncellenme || '').localeCompare(String(a.guncellenme || '')))

  try {
    writeCurrentOrders(list)
    return res.json({ ok: true, item: finalItem, total: list.length })
  } catch (err) {
    console.error('Guncel siparis yazma hatasi:', err.message)
    return res.status(500).json({ error: 'Guncel siparis kaydedilemedi' })
  }
})

// ============================================================
//  TEKNIK CIZIMLER — klasorden listele ve dosya goster
// ============================================================

const DRAWING_EXTENSIONS = new Set(['.pdf', '.dwg', '.dxf'])
const DRAWINGS_CACHE_MS = 60 * 1000
let drawingsCache = { time: 0, payload: { items: [], rawTotal: 0, dedupedTotal: 0 } }
const TECH_DRAWINGS_UPLOAD_KEY = String(process.env.TECH_DRAWINGS_UPLOAD_KEY || '').trim()

const drawingDirCandidates = [
  'C:/Users/Lenovo/Desktop/TEKNİK ÇİZİM',
  'C:/Users/Lenovo/Desktop/TEKNIK CIZIM',
  path.resolve(__dirname, '../TEKNIK CIZIM'),
]
  .filter(Boolean)
  .map((p) => path.resolve(p))

const configuredDrawingsDir = String(process.env.TECH_DRAWINGS_DIR || '').trim()
const existingDrawingDir = drawingDirCandidates.find((p) => {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}) || null
const TECH_DRAWINGS_DIR = configuredDrawingsDir ? path.resolve(configuredDrawingsDir) : existingDrawingDir

function toPosix(p) {
  return String(p).replace(/\\/g, '/')
}

function normalizeDrawingText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function drawingIdFromRelative(relativePath) {
  return Buffer.from(String(relativePath), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function relativeFromDrawingId(id) {
  const normalized = String(id || '').replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function resolveDrawingAbsolutePath(relativePath) {
  if (!TECH_DRAWINGS_DIR) return null
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '')
  const abs = path.resolve(TECH_DRAWINGS_DIR, safeRelative)
  const root = path.resolve(TECH_DRAWINGS_DIR)
  if (abs !== root && !abs.startsWith(root + path.sep)) return null
  return abs
}

function ensureTechDrawingsDir() {
  if (!TECH_DRAWINGS_DIR) return false
  try {
    fs.mkdirSync(TECH_DRAWINGS_DIR, { recursive: true })
    return fs.existsSync(TECH_DRAWINGS_DIR) && fs.statSync(TECH_DRAWINGS_DIR).isDirectory()
  } catch {
    return false
  }
}

function walkDrawings(dir, output) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDrawings(full, output)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (!DRAWING_EXTENSIONS.has(ext)) continue
    const stat = fs.statSync(full)
    const relative = toPosix(path.relative(TECH_DRAWINGS_DIR, full))
    output.push({
      id: drawingIdFromRelative(relative),
      name: entry.name,
      relativePath: relative,
      extension: ext.slice(1),
      canPreview: ext === '.pdf',
      mtimeMs: stat.mtimeMs || 0,
      sizeBytes: stat.size || 0,
    })
  }
}

function canonicalDrawingKey(name, extension) {
  let stem = String(name || '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
    .trim()

  // Kopya suffix'lerini temizle: "(1)", "-1", "(copy)" vb.
  let prev = null
  while (stem !== prev) {
    prev = stem
    stem = stem
      .replace(/\s*\((?:copy|\d+)\)\s*$/i, '')
      .replace(/\s*-\d+\s*$/i, '')
      .trim()
  }

  return `${normalizeDrawingText(stem).replace(/\s+/g, ' ')}|${extension}`
}

function extractRevisionRank(item) {
  const text = normalizeDrawingText(`${item.name} ${item.relativePath}`)
  let rank = 0
  for (const m of text.matchAll(/\b(?:rev|revision|r|v)\s*[-_.]?\s*(\d{1,3})\b/g)) {
    rank = Math.max(rank, parseInt(m[1], 10) || 0)
  }
  return rank
}

function isCopyLikeName(name) {
  return /\((?:copy|\d+)\)\s*(?:\.[^.]+)?$/i.test(name) || /-\d+\.[^.]+$/i.test(name)
}

function pickBetterDrawing(a, b) {
  if ((a.revisionRank || 0) !== (b.revisionRank || 0)) {
    return (a.revisionRank || 0) > (b.revisionRank || 0) ? a : b
  }
  const aCopy = isCopyLikeName(a.name)
  const bCopy = isCopyLikeName(b.name)
  if (aCopy !== bCopy) return aCopy ? b : a
  if ((a.name || '').length !== (b.name || '').length) {
    return (a.name || '').length < (b.name || '').length ? a : b
  }
  if ((a.mtimeMs || 0) !== (b.mtimeMs || 0)) {
    return (a.mtimeMs || 0) > (b.mtimeMs || 0) ? a : b
  }
  if ((a.sizeBytes || 0) !== (b.sizeBytes || 0)) {
    return (a.sizeBytes || 0) > (b.sizeBytes || 0) ? a : b
  }
  return a.relativePath.length <= b.relativePath.length ? a : b
}

function dedupeDrawings(items) {
  const byKey = new Map()
  for (const item of items) {
    const withRevision = { ...item, revisionRank: extractRevisionRank(item) }
    const key = canonicalDrawingKey(withRevision.name, withRevision.extension)
    const mevcut = byKey.get(key)
    byKey.set(key, mevcut ? pickBetterDrawing(withRevision, mevcut) : withRevision)
  }
  return [...byKey.values()]
}

function toPublicDrawing(item) {
  return {
    id: item.id,
    name: item.name,
    relativePath: item.relativePath,
    extension: item.extension,
    canPreview: item.canPreview,
  }
}

function getDrawings() {
  if (!TECH_DRAWINGS_DIR) return { items: [], rawTotal: 0, dedupedTotal: 0 }
  const now = Date.now()
  if (drawingsCache.payload.items.length && now - drawingsCache.time < DRAWINGS_CACHE_MS) {
    return drawingsCache.payload
  }
  const raw = []
  walkDrawings(TECH_DRAWINGS_DIR, raw)
  const deduped = dedupeDrawings(raw)
  deduped.sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true, sensitivity: 'base' }))
  const payload = {
    items: deduped.map(toPublicDrawing),
    rawTotal: raw.length,
    dedupedTotal: deduped.length,
  }
  drawingsCache = { time: now, payload }
  return payload
}

app.get('/api/technical-drawings', (req, res) => {
  if (!TECH_DRAWINGS_DIR) {
    return res.json({
      total: 0,
      rawTotal: 0,
      dedupedTotal: 0,
      filtered: 0,
      rootDir: null,
      items: [],
      warning: 'TECH_DRAWINGS_DIR bulunamadi',
    })
  }
  const q = String(req.query.q || '').trim().toLowerCase()
  const { items: all, rawTotal, dedupedTotal } = getDrawings()
  const items = q
    ? all.filter((d) =>
      d.name.toLowerCase().includes(q) || d.relativePath.toLowerCase().includes(q)
    )
    : all

  res.json({
    total: all.length,
    rawTotal,
    dedupedTotal,
    filtered: items.length,
    rootDir: TECH_DRAWINGS_DIR,
    items,
  })
})

app.get('/api/technical-drawings/:id/file', (req, res) => {
  if (!TECH_DRAWINGS_DIR) {
    return res.status(404).json({ error: 'Bu sunucuda teknik cizim arsivi bagli degil' })
  }

  let relative
  try {
    relative = relativeFromDrawingId(req.params.id)
  } catch {
    return res.status(400).json({ error: 'Gecersiz cizim kimligi' })
  }

  const abs = resolveDrawingAbsolutePath(relative)
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return res.status(404).json({ error: 'Cizim dosyasi bulunamadi' })
  }

  res.setHeader('Content-Disposition', `inline; filename="${path.basename(abs)}"`)
  return res.sendFile(abs)
})

app.post('/api/technical-drawings/upload', (req, res) => {
  if (!TECH_DRAWINGS_UPLOAD_KEY) {
    return res.status(503).json({ error: 'TECH_DRAWINGS_UPLOAD_KEY tanimli degil' })
  }
  const key = String(req.headers['x-upload-key'] || '')
  if (key !== TECH_DRAWINGS_UPLOAD_KEY) {
    return res.status(401).json({ error: 'Yetkisiz yukleme istegi' })
  }
  if (!ensureTechDrawingsDir()) {
    return res.status(503).json({ error: 'TECH_DRAWINGS_DIR hazir degil' })
  }

  const relativePath = String(req.body?.relativePath || '').trim().replace(/\\/g, '/')
  const contentBase64 = String(req.body?.contentBase64 || '')
  const overwrite = Boolean(req.body?.overwrite)

  if (!relativePath || relativePath.includes('\0')) {
    return res.status(400).json({ error: 'relativePath zorunlu' })
  }

  const ext = path.extname(relativePath).toLowerCase()
  if (!DRAWING_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'Desteklenmeyen dosya uzantisi' })
  }

  const abs = resolveDrawingAbsolutePath(relativePath)
  if (!abs) {
    return res.status(400).json({ error: 'Gecersiz dosya yolu' })
  }

  let fileBuffer
  try {
    fileBuffer = Buffer.from(contentBase64, 'base64')
  } catch {
    return res.status(400).json({ error: 'contentBase64 gecersiz' })
  }
  if (!fileBuffer.length) {
    return res.status(400).json({ error: 'Bos dosya yuklenemez' })
  }
  if (fileBuffer.length > 20 * 1024 * 1024) {
    return res.status(413).json({ error: 'Dosya limiti asildi (20MB)' })
  }

  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    if (!overwrite && fs.existsSync(abs)) {
      return res.status(409).json({ error: 'Dosya zaten var', relativePath })
    }
    fs.writeFileSync(abs, fileBuffer)
    drawingsCache = { time: 0, payload: { items: [], rawTotal: 0, dedupedTotal: 0 } }
    return res.json({ ok: true, relativePath, sizeBytes: fileBuffer.length })
  } catch (err) {
    return res.status(500).json({ error: `Yukleme basarisiz: ${err.message}` })
  }
})

// ============================================================
//  ORTAM KONTROLÜ — eksik env değişkenlerini açılışta bildir
// ============================================================

const ZORUNLU_ENV = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
const OPSIYONEL_ENV = ['CLAUDE_API_KEY', 'SERPER_API_KEY']

const eksik = ZORUNLU_ENV.filter((k) => !process.env[k])
if (eksik.length) {
  console.warn('⚠️  Eksik zorunlu env değişkenleri:', eksik.join(', '))
  console.warn('   /api/send-mail çalışmayacak.')
}
const eksikOps = OPSIYONEL_ENV.filter((k) => !process.env[k])
if (eksikOps.length) {
  console.warn('⚠️  Opsiyonel env değişkenleri yok:', eksikOps.join(', '))
  console.warn('   Firma arama (Claude/Serper) çalışmayabilir.')
}

// ============================================================
//  MAIL
// ============================================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
})

app.get('/health', (req, res) => res.json({ ok: true }))

app.post('/api/send-mail', async (req, res) => {
  const { to, subject, body } = req.body || {}
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, body zorunlu' })
  }

  try {
    await transporter.sendMail({
      from: `"Turkal Aluminium" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: body,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Mail hatası:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
//  CLAUDE PROXY — API anahtarı backend'de tutulur, tarayıcıya sızmaz
// ============================================================

app.post('/api/claude', async (req, res) => {
  if (!process.env.CLAUDE_API_KEY) {
    return res.status(503).json({ error: 'CLAUDE_API_KEY tanımlı değil' })
  }

  const { prompt, model = 'claude-sonnet-4-5', max_tokens = 4000 } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt (string) zorunlu' })
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json()
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || `Claude ${r.status}` })
    }
    res.json(data)
  } catch (err) {
    console.error('Claude hatası:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
//  SERPER PROXY — API anahtarı backend'de
// ============================================================

app.post('/api/serper', async (req, res) => {
  if (!process.env.SERPER_API_KEY) {
    return res.status(503).json({ error: 'SERPER_API_KEY tanımlı değil' })
  }

  const { q, num = 10 } = req.body || {}
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'q (string) zorunlu' })
  }

  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, num }),
    })

    if (!r.ok) return res.status(r.status).json({ error: `Serper ${r.status}` })
    const data = await r.json()
    res.json(data)
  } catch (err) {
    console.error('Serper hatası:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ============================================================
//  LME ALÜMİNYUM FİYATI
//  NOT: investing.com Cloudflare challenge veriyor, server-side
//  scrape edilemiyor. Aynı LME benchmark verisini
//  tradingeconomics.com'dan alıyoruz (aynı kaynak, farklı yüz).
// ============================================================

const LME_URL = 'https://tradingeconomics.com/commodity/aluminum'
const LME_CACHE_MS = 2 * 60 * 1000
const lmeCache = { data: null, time: 0 }

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

async function lmeFiyatCek() {
  const res = await fetch(LME_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) throw new Error(`tradingeconomics HTTP ${res.status}`)
  const html = await res.text()

  const metaMatch = html.match(/<meta\s+id="metaDesc"[^>]*content="([^"]+)"/i) ||
    html.match(/<meta\s+name="description"[^>]*content="([^"]+)"/i)
  if (!metaMatch) throw new Error('Meta description bulunamadı')

  const meta = decodeHtmlEntities(metaMatch[1])

  const priceM = meta.match(/to\s+([\d,.]+)\s+USD\/T/i)
  const dateM = meta.match(/on\s+([A-Z][a-z]+\s+\d+,\s*\d{4})/)
  const gunlukM = meta.match(/(up|down)\s+([\d.]+)%\s+from the previous day/i)
  const aylikM = meta.match(/past month[\s\S]+?(risen|fallen|dropped|gained|lost|declined)\s+([\d.]+)%/i)
  const yillikM = meta.match(/(up|down)\s+([\d.]+)%\s+compared to the same time last year/i)

  if (!priceM) throw new Error('Fiyat parse edilemedi')

  const price = parseFloat(priceM[1].replace(/,/g, ''))
  const changePct = gunlukM
    ? (gunlukM[1].toLowerCase() === 'down' ? -1 : 1) * parseFloat(gunlukM[2])
    : null
  const change = changePct != null ? (price * changePct) / 100 : null

  const aylikYon = aylikM && /fallen|dropped|lost/i.test(aylikM[1]) ? -1 : 1
  const aylikPct = aylikM ? aylikYon * parseFloat(aylikM[2]) : null

  const yillikPct = yillikM
    ? (yillikM[1].toLowerCase() === 'down' ? -1 : 1) * parseFloat(yillikM[2])
    : null

  return {
    price,
    change,
    changePercent: changePct,
    monthPercent: aylikPct,
    yearPercent: yillikPct,
    currency: 'USD',
    unit: 'ton',
    source: 'tradingeconomics.com (LME benchmark)',
    date: dateM ? dateM[1] : null,
    fetchedAt: new Date().toISOString(),
  }
}

app.get('/api/lme-aluminum', async (req, res) => {
  const simdi = Date.now()
  if (lmeCache.data && simdi - lmeCache.time < LME_CACHE_MS) {
    return res.json({ ...lmeCache.data, cached: true, cacheAgeMs: simdi - lmeCache.time })
  }

  try {
    const data = await lmeFiyatCek()
    lmeCache.data = data
    lmeCache.time = simdi
    res.json({ ...data, cached: false })
  } catch (err) {
    console.error('LME fiyat hatası:', err.message)
    if (lmeCache.data) {
      return res.json({
        ...lmeCache.data,
        cached: true,
        stale: true,
        cacheAgeMs: simdi - lmeCache.time,
        warning: err.message,
      })
    }
    res.status(503).json({ error: err.message })
  }
})

// ============================================================
//  SUNUCU
// ============================================================

const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`)
  console.log(`   - CORS allowlist: ${[...allowedOrigins].join(', ') || '(boş)'}`)
  if (allowVercelPreviews) console.log('   - CORS: *.vercel.app preview domainleri açık')
  console.log(`   - Mail:   POST /api/send-mail`)
  console.log(`   - Claude: POST /api/claude`)
  console.log(`   - Serper: POST /api/serper`)
  console.log(`   - LME:    GET  /api/lme-aluminum`)
  console.log(`   - Draw:   GET  /api/technical-drawings`)
  console.log(`   - Prod:   GET  /api/production-reports`)
  console.log(`   - ProdW:  POST /api/production-reports`)
  console.log(`   - Order:  GET  /api/current-orders`)
  console.log(`   - OrderW: POST /api/current-orders`)
  if (TECH_DRAWINGS_DIR) {
    console.log(`   - Cizim klasoru: ${TECH_DRAWINGS_DIR}`)
  } else {
    console.warn('⚠️  Teknik cizim klasoru bulunamadi. TECH_DRAWINGS_DIR tanimlayin.')
  }
})
