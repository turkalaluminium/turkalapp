import { Navigate } from 'react-router-dom'
import { getAuthSession, hasAnyRole } from '../utils/auth'

export default function RequireRole({ roles = [], children }) {
  const session = getAuthSession()
  if (!session) return <Navigate to="/giris" replace />
  if (!hasAnyRole(session, roles)) return <Navigate to="/menu" replace />
  return children
}
