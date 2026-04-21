import { useEffect, useState, useRef } from 'react'
import { apiUrl } from './api'

const POLL_MS = 2 * 60 * 1000 // Her 2 dakikada bir yenile

export function useLmeFiyat() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const aktif = useRef(true)

  async function cek() {
    try {
      const res = await fetch(apiUrl('/api/lme-aluminum'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!aktif.current) return
      setData(json)
      setError(null)
    } catch (e) {
      if (!aktif.current) return
      setError(e.message || 'Fiyat alınamadı')
    } finally {
      if (aktif.current) setLoading(false)
    }
  }

  useEffect(() => {
    aktif.current = true
    cek()
    const id = setInterval(cek, POLL_MS)
    return () => {
      aktif.current = false
      clearInterval(id)
    }
  }, [])

  return { data, loading, error, refresh: cek }
}

export function formatFiyat(n) {
  if (n == null || isNaN(n)) return '-'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatSaat(iso) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}
