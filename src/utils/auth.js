const AUTH_KEY = 'turkal_auth_session'

export const ROLES = {
  PATRON: 'patron',
  OPERATOR: 'operator',
  SATIS: 'satis',
}

export const ROLE_LABELS = {
  [ROLES.PATRON]: 'Patron',
  [ROLES.OPERATOR]: 'Operator',
  [ROLES.SATIS]: 'Satis',
}

// Not: Bu app icin basit rol girisi. Gerekirse backend auth'a tasinabilir.
const USERS = [
  { username: 'patron', password: 'turkal123', role: ROLES.PATRON, name: 'Patron' },
  { username: 'operator', password: 'turkal123', role: ROLES.OPERATOR, name: 'Operator' },
  { username: 'satis', password: 'turkal123', role: ROLES.SATIS, name: 'Satis' },
]

export function getAuthSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
    if (!parsed || !parsed.role) return null
    return parsed
  } catch {
    return null
  }
}

export function loginWithCredentials(username, password) {
  const user = USERS.find(
    (u) => u.username.toLowerCase() === String(username || '').trim().toLowerCase()
      && u.password === String(password || '')
  )
  if (!user) return { ok: false, error: 'Kullanici adi veya sifre hatali' }

  const session = {
    username: user.username,
    role: user.role,
    name: user.name,
    loginAt: new Date().toISOString(),
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
  return { ok: true, session }
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

export function hasAnyRole(session, allowedRoles) {
  if (!session?.role) return false
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true
  return allowedRoles.includes(session.role)
}
