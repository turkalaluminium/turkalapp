const KEY = 'turkal_firmalar'
const URETIM_RAPOR_KEY = 'turkal_uretim_raporlari'

export function getKaydedilenler() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function firmaKaydet(firma) {
  const list = getKaydedilenler()
  const exists = list.find(f => f.url === firma.url)
  if (exists) return
  const yeni = {
    ...firma,
    id: Date.now(),
    kaydedilme: new Date().toISOString(),
    durum: 'Yeni',
  }
  list.unshift(yeni)
  localStorage.setItem(KEY, JSON.stringify(list))
  return yeni
}

export function firmaSil(id) {
  const list = getKaydedilenler().filter(f => f.id !== id)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function firmaDurumGuncelle(id, durum) {
  const list = getKaydedilenler().map(f =>
    f.id === id ? { ...f, durum } : f
  )
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function isKayitli(url) {
  return getKaydedilenler().some(f => f.url === url)
}

export function getUretimRaporlari() {
  try {
    const list = JSON.parse(localStorage.getItem(URETIM_RAPOR_KEY) || '[]')
    return Array.isArray(list)
      ? list.sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')))
      : []
  } catch {
    return []
  }
}

export function uretimRaporKaydet({ tarih, presTon, eloksalTon, not }) {
  const list = getUretimRaporlari()
  const payload = {
    tarih,
    presTon: Number(presTon),
    eloksalTon: Number(eloksalTon),
    not: (not || '').trim(),
    guncellenme: new Date().toISOString(),
  }

  const idx = list.findIndex((x) => x.tarih === tarih)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...payload }
  } else {
    list.unshift(payload)
  }

  list.sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')))
  localStorage.setItem(URETIM_RAPOR_KEY, JSON.stringify(list))
  return payload
}
