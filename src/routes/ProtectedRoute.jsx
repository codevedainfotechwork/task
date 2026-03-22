import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ROLE_DEFAULTS = {
  employee: '/employee',
  manager: '/manager',
  admin: '/admin',
};

export function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={ROLE_DEFAULTS[currentUser.role]} replace />;
  }
  return children;
}
