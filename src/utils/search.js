import { apiUrl } from './api'

// Not: API anahtarları artık backend'de. Frontend sadece /api/claude ve /api/serper
// proxy endpoint'lerini çağırır. Böylece anahtarlar tarayıcı bundle'ına sızmaz.

// ============================================================
//  SABITLER
// ============================================================

const SOSYAL_MEDYA = [
  'linkedin.com', 'instagram.com', 'facebook.com',
  'twitter.com', 'x.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
]

const IG_YASAKLI_PATH = ['p', 'reel', 'reels', 'stories', 'tv', 'explore', 'accounts', 'about', 'directory', 'web']

const SIRKET_TAKI = /\b(ltd|limited|gmbh|inc|llc|co|corp|corporation|srl|s\.r\.l|spa|s\.p\.a|sa|s\.a|bv|b\.v|as|a\.s|plc|sarl|s\.a\.r\.l|kg|ag|oy|ab|pty|pvt|nv|n\.v|holding|group|trading|company)\.?$/gi

// İş rehberi / finans / pazaryeri / ansiklopedi — resmi site DEĞİL
const AGREGATOR = [
  'yahoo.com', 'finance.yahoo', 'bloomberg.com', 'reuters.com', 'forbes.com', 'wsj.com',
  'nasdaq.com', 'marketscreener.com', 'stockanalysis.com', 'seekingalpha.com', 'investing.com',
  'crunchbase.com', 'zoominfo.com', 'dnb.com', 'bizapedia.com', 'opencorporates.com',
  'companieshouse.gov.uk', 'pitchbook.com', 'owler.com', 'rocketreach.co', 'apollo.io',
  'europages.', 'kompass.com', 'thomasnet.com', 'tradeindia.com', 'indiamart.com',
  'alibaba.com', 'made-in-china.com', 'globalsources.com', 'ec21.com', 'tradewheel.com',
  'exportersindia.com',
  'wikipedia.org', 'wikidata.org', 'wikimedia.org',
  'google.com/maps', 'maps.google', 'yelp.com', 'yellowpages.', 'trustpilot.com',
  'glassdoor.com', 'indeed.com', 'ycombinator.com',
  'amazon.', 'ebay.', 'etsy.com', 'aliexpress.com',
  'bbb.org', 'reddit.com', 'quora.com', 'medium.com', 'substack.com',
]

const ULKE_SINYALLERI = {
  Austria: ['austria', 'austrian', 'osterreich', 'österreich'],
  Belgium: ['belgium', 'belgian', 'belgique', 'belgie', 'belgië'],
  Denmark: ['denmark', 'danish', 'danmark'],
  Germany: ['germany', 'german', 'deutschland', 'deutsche'],
  France: ['france', 'french', 'francais', 'français'],
  'United Kingdom': ['united kingdom', 'uk', 'britain', 'british', 'england', 'scotland', 'wales', 'northern ireland'],
  Italy: ['italy', 'italian', 'italia'],
  Netherlands: ['netherlands', 'dutch', 'holland'],
  Poland: ['poland', 'polish', 'polska'],
  Spain: ['spain', 'spanish', 'espana', 'españa'],
  Sweden: ['sweden', 'swedish', 'sverige'],
  Switzerland: ['switzerland', 'swiss', 'schweiz', 'suisse'],
  'United States': ['united states', 'usa', 'u.s.', 'america', 'american'],
  Australia: ['australia', 'australian'],
  Canada: ['canada', 'canadian'],
  'Saudi Arabia': ['saudi arabia', 'saudi', 'ksa'],
  UAE: ['uae', 'united arab emirates', 'emirates', 'dubai', 'abu dhabi'],
  Japan: ['japan', 'japanese', 'nippon'],
}

const ULKE_TLD = {
  Austria: ['.at'],
  Belgium: ['.be'],
  Denmark: ['.dk'],
  Germany: ['.de'],
  France: ['.fr'],
  'United Kingdom': ['.uk', '.co.uk'],
  Italy: ['.it'],
  Netherlands: ['.nl'],
  Poland: ['.pl'],
  Spain: ['.es'],
  Sweden: ['.se'],
  Switzerland: ['.ch'],
  'United States': ['.us'],
  Australia: ['.au'],
  Canada: ['.ca'],
  'Saudi Arabia': ['.sa'],
  UAE: ['.ae'],
  Japan: ['.jp'],
}

// ============================================================
//  YARDIMCILAR
// ============================================================

async function serperSearch(query, num = 10) {
  try {
    const res = await fetch(apiUrl('/api/serper'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.organic || []
  } catch {
    return []
  }
}

function temizAd(firmaAdi) {
  if (!firmaAdi) return ''
  return firmaAdi
    .split(/[—–\-:|(,]/)[0]
    .trim()
    .replace(SIRKET_TAKI, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sadeKarakter(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function domainKoku(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    return host.split('.')[0]
  } catch {
    return null
  }
}

function ulkeSinyalSkoru(text, countryEn) {
  const normalized = normalizeText(text)
  const hedefler = ULKE_SINYALLERI[countryEn] || [countryEn.toLowerCase()]
  const targetHit = hedefler.some(k => normalized.includes(normalizeText(k)))

  const digerHit = Object.entries(ULKE_SINYALLERI).some(([ulke, kelimeler]) => {
    if (ulke === countryEn) return false
    return kelimeler.some(k => normalized.includes(normalizeText(k)))
  })

  return { targetHit, digerHit }
}

function hedefTldVarMi(url, countryEn) {
  if (!url) return false
  const tlds = ULKE_TLD[countryEn] || []
  if (!tlds.length) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return tlds.some(tld => host.endsWith(tld))
  } catch {
    return false
  }
}

async function firmaUlkeyeUyuyorMu(firma, countryEn) {
  const ilkMetin = [
    firma?.name || '',
    firma?.snippet || '',
    firma?.website || '',
    firma?.linkedin || '',
    firma?.instagram || '',
  ].join(' ')
  const ilkSinyal = ulkeSinyalSkoru(ilkMetin, countryEn)

  // Claude metninde açıkça başka ülke geçiyorsa erken ele.
  if (!ilkSinyal.targetHit && ilkSinyal.digerHit) return false
  if (hedefTldVarMi(firma?.website, countryEn)) return true

  // Emin değilsek Serper ile tek ek doğrulama yap.
  const sonuc = await serperSearch(`"${firma?.name || ''}" ${countryEn} company`, 5)
  if (!sonuc.length) return !!ilkSinyal.targetHit

  let puan = 0
  for (const r of sonuc) {
    const metin = `${r.title || ''} ${r.snippet || ''}`
    const sinyal = ulkeSinyalSkoru(metin, countryEn)
    if (sinyal.targetHit) puan += 2
    if (sinyal.digerHit && !sinyal.targetHit) puan -= 2
    if (hedefTldVarMi(r.link, countryEn)) puan += 1
  }

  if (puan >= 2) return true
  if (puan <= -2) return false
  return !!ilkSinyal.targetHit
}

function isSosyal(link) {
  return !!link && SOSYAL_MEDYA.some(sm => link.includes(sm))
}

function isAgregator(link) {
  if (!link) return false
  const l = link.toLowerCase()
  return AGREGATOR.some(a => l.includes(a))
}

// İki metnin benzerlik skoru (0–100)
function benzerlik(a, b) {
  const sa = sadeKarakter(a)
  const sb = sadeKarakter(b)
  if (!sa || !sb) return 0
  if (sa === sb) return 100
  if (sa.includes(sb) || sb.includes(sa)) {
    const kisa = Math.min(sa.length, sb.length)
    const uzun = Math.max(sa.length, sb.length)
    return Math.round((kisa / uzun) * 80) + 10
  }
  let en = 0
  for (let i = 0; i < sa.length; i++) {
    for (let j = 0; j < sb.length; j++) {
      let k = 0
      while (i + k < sa.length && j + k < sb.length && sa[i + k] === sb[j + k]) k++
      if (k > en) en = k
    }
  }
  return Math.round((en / Math.max(sa.length, sb.length)) * 70)
}

// ============================================================
//  URL NORMALİZASYON + DOĞRULAMA
// ============================================================

function normalizeWebsite(url) {
  if (!url || typeof url !== 'string') return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const parsed = new URL(u)
    if (isSosyal(parsed.hostname) || isAgregator(parsed.href)) return null
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function normalizeInstagram(url) {
  if (!url || typeof url !== 'string') return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const parsed = new URL(u)
    if (!parsed.hostname.includes('instagram.com')) return null
    const parca = parsed.pathname.split('/').filter(Boolean)
    if (parca.length === 0) return null
    const slug = parca[0].toLowerCase()
    if (IG_YASAKLI_PATH.includes(slug)) return null
    if (slug.length < 2) return null
    return `https://www.instagram.com/${slug}/`
  } catch {
    return null
  }
}

function normalizeLinkedin(url) {
  if (!url || typeof url !== 'string') return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const parsed = new URL(u)
    if (!parsed.hostname.includes('linkedin.com')) return null
    const m = parsed.pathname.match(/^\/(?:[a-z]{2}\/)?company\/([^/?#]+)/i)
    if (!m) return null
    return `https://www.linkedin.com/company/${m[1].toLowerCase()}/`
  } catch {
    return null
  }
}

function normalizeWhatsapp(url) {
  if (!url || typeof url !== 'string') return null
  let u = url.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const parsed = new URL(u)
    if (!parsed.hostname.includes('wa.me') && !parsed.hostname.includes('whatsapp.com')) return null
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

// ============================================================
//  SERPER FALLBACK'LERİ (Claude bilmiyorsa)
// ============================================================

function websiteSkor(result, firmaTemiz) {
  if (!result?.link) return 0
  if (isSosyal(result.link) || isAgregator(result.link)) return 0
  try {
    const u = new URL(result.link)
    const host = u.hostname.replace(/^www\./, '')
    const rootDomain = host.split('.').slice(0, -1).join('.') || host
    const domainSkor = benzerlik(rootDomain, firmaTemiz)
    const basSkor = benzerlik(result.title || '', firmaTemiz) * 0.4
    const pathBonus = u.pathname === '/' || u.pathname === '' ? 10 : 0
    return domainSkor + basSkor + pathBonus
  } catch {
    return 0
  }
}

async function websiteSerperBul(firmaAdi, countryEn, keyword) {
  const temiz = temizAd(firmaAdi)
  if (!temiz) return null

  const queries = [
    `"${temiz}" ${countryEn} official site`,
    `"${temiz}" ${keyword} ${countryEn}`,
    `"${temiz}" ${countryEn}`,
  ]

  let enIyi = null
  let enIyiSkor = 25

  for (const q of queries) {
    const results = await serperSearch(q, 10)
    for (const r of results) {
      const skor = websiteSkor(r, temiz)
      if (skor > enIyiSkor) {
        enIyiSkor = skor
        enIyi = normalizeWebsite(r.link)
        if (skor >= 70) return enIyi
      }
    }
  }
  return enIyi
}

async function instagramSerperBul(firmaAdi, websiteUrl) {
  const temiz = temizAd(firmaAdi)
  if (!temiz) return null
  const domain = websiteUrl ? domainKoku(websiteUrl) : null
  const hedefler = [domain, temiz].filter(Boolean)

  const queries = []
  if (domain) queries.push(`site:instagram.com "${domain}"`)
  queries.push(`site:instagram.com "${temiz}"`)
  queries.push(`"${temiz}" instagram`)

  let enIyi = null
  let enIyiSkor = 30

  for (const q of queries) {
    const results = await serperSearch(q, 10)
    for (const r of results) {
      const profil = normalizeInstagram(r.link)
      if (!profil) continue
      const slug = profil.match(/instagram\.com\/([^/]+)/)?.[1] || ''
      const skor = Math.max(
        ...hedefler.map(h => benzerlik(slug, h)),
        benzerlik(r.title || '', temiz) * 0.6,
      )
      if (skor > enIyiSkor) {
        enIyiSkor = skor
        enIyi = profil
        if (skor >= 80) return enIyi
      }
    }
  }
  return enIyi
}

async function linkedinSerperBul(firmaAdi, countryEn, websiteUrl) {
  const temiz = temizAd(firmaAdi)
  if (!temiz) return null
  const domain = websiteUrl ? domainKoku(websiteUrl) : null
  const hedefler = [domain, temiz].filter(Boolean)

  const queries = []
  if (domain) queries.push(`site:linkedin.com/company "${domain}"`)
  queries.push(`site:linkedin.com/company "${temiz}" ${countryEn}`)
  queries.push(`site:linkedin.com/company "${temiz}"`)
  queries.push(`"${temiz}" ${countryEn} linkedin`)

  let enIyi = null
  let enIyiSkor = 30

  for (const q of queries) {
    const results = await serperSearch(q, 10)
    for (const r of results) {
      const profil = normalizeLinkedin(r.link)
      if (!profil) continue
      const slug = profil.match(/company\/([^/]+)/)?.[1] || ''
      const skor = Math.max(
        ...hedefler.map(h => benzerlik(slug, h)),
        benzerlik(r.title || '', temiz) * 0.6,
      )
      if (skor > enIyiSkor) {
        enIyiSkor = skor
        enIyi = profil
        if (skor >= 80) return enIyi
      }
    }
  }
  return enIyi
}

async function whatsappSerperBul(firmaAdi) {
  const temiz = temizAd(firmaAdi)
  if (!temiz) return null
  const queries = [
    `site:wa.me "${temiz}"`,
    `"${temiz}" wa.me`,
    `"${temiz}" whatsapp contact`,
  ]
  for (const q of queries) {
    const results = await serperSearch(q, 5)
    for (const r of results) {
      const n = normalizeWhatsapp(r.link)
      if (n) return n
    }
  }
  return null
}

// ============================================================
//  CLAUDE — TEK ÇAĞRIDA HER ŞEYİ İSTE
// ============================================================

async function claudeFirmaListesi(keyword, countryTr, countryEn) {
  const prompt = `Sen bir ihracat araştırma uzmanısın. Türk alüminyum profil üreticisi Turkal Aluminium için ${countryTr} (${countryEn}) pazarında potansiyel müşteri araştırıyorsun.

"${keyword}" ürününü ${countryTr}'de satın alan, ithal eden, kullanan veya satan GERÇEK ve BİLİNEN 12 firma listele.

Her firma için bildiklerini ver. BİLMEDİĞİN alanları mutlaka null bırak — TAHMİN ETME, UYDURMA.

Sadece JSON array döndür, başka hiçbir metin yazma:

[
  {
    "name": "Firmanın resmi TAM adı (borsa ticker'ı veya kısaltma DEĞİL — uzun, açık, ayırt edici)",
    "snippet": "Ne iş yaptığı, 1 kısa cümle",
    "website": "https://... (sadece kesin bildiğin resmi site) veya null",
    "linkedin": "https://www.linkedin.com/company/... (sadece kesin bildiğin) veya null",
    "instagram": "https://www.instagram.com/... (sadece kesin bildiğin) veya null"
  }
]

KESİN KURALLAR:
- Sadece gerçekten var olan firmalar — uydurma
- İsim "XYZ Corp" veya "QEPC" gibi kısaltma değil, tam ticari unvan olsun
- URL'yi sadece %95+ emin olduğun durumda ver. En ufak şüphede null yaz
- LinkedIn mutlaka /company/ formatında olmalı
- Instagram mutlaka profil URL'i olmalı (/p/ veya /reel/ değil)
- Website sosyal medya veya Wikipedia/Yahoo/Bloomberg gibi 3. parti site olmayacak — sadece firmanın kendi domain'i
- Sadece JSON array döndür, açıklama yazma`

  const res = await fetch(apiUrl('/api/claude'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `Claude API hatası: ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text?.trim() || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude geçerli sonuç döndürmedi')
  return JSON.parse(jsonMatch[0])
}

// ============================================================
//  ANA ARAMA
// ============================================================

export async function claudeSearch(keyword, countryTr, countryEn, onFirmaHazir, onFirmaBasladi) {
  const hamFirmalar = await claudeFirmaListesi(keyword, countryTr, countryEn)
  const dogrulanan = await Promise.all(
    hamFirmalar.map(async (firma) => ((await firmaUlkeyeUyuyorMu(firma, countryEn)) ? firma : null))
  )
  const firmalar = dogrulanan.filter(Boolean)
  if (!firmalar.length) {
    throw new Error(`${countryTr} için doğrulanan firma bulunamadı. Anahtar kelimeyi daha genel deneyin.`)
  }

  // UI'a placeholder'ları hemen bildir
  firmalar.forEach((f, idx) => {
    onFirmaBasladi?.({ name: f.name, snippet: f.snippet || '', idx })
  })

  // Her firmayı paralel işle — Claude'un verdiğini normalize et, eksikleri Serper'dan doldur
  await Promise.all(
    firmalar.map(async (f, idx) => {
      const firmaAdi = f.name || ''

      // 1) Claude'un verdiklerini normalize et (geçersizse null olur)
      let website = normalizeWebsite(f.website)
      let linkedin = normalizeLinkedin(f.linkedin)
      let instagram = normalizeInstagram(f.instagram)

      // 2) Eksikleri Serper'dan tamamla
      if (!website) {
        website = await websiteSerperBul(firmaAdi, countryEn, keyword)
      }
      const [liFallback, igFallback, whatsapp] = await Promise.all([
        linkedin ? Promise.resolve(linkedin) : linkedinSerperBul(firmaAdi, countryEn, website),
        instagram ? Promise.resolve(instagram) : instagramSerperBul(firmaAdi, website),
        whatsappSerperBul(firmaAdi),
      ])
      linkedin = liFallback
      instagram = igFallback

      onFirmaHazir?.({
        idx,
        name: firmaAdi,
        snippet: f.snippet || '',
        url: website || `https://www.google.com/search?q=${encodeURIComponent(firmaAdi + ' ' + countryEn)}`,
        linkedin: linkedin || null,
        instagram: instagram || null,
        whatsapp: whatsapp || null,
        analiz: null,
        websiteBulundu: !!website,
      })
    })
  )
}
