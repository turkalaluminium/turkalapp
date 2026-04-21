const FALLBACK_VERCEL_API_BASE = 'https://turkalapp-production.up.railway.app'
const RAW_API_BASE = (import.meta.env.VITE_API_URL || '').trim()
const isVercelHost =
  typeof window !== 'undefined' && typeof window.location?.hostname === 'string'
    ? window.location.hostname.endsWith('.vercel.app')
    : false

const API_BASE = (RAW_API_BASE || (isVercelHost ? FALLBACK_VERCEL_API_BASE : '')).replace(/\/+$/, '')

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath
}
