// Route guard: redirects unauthenticated users to /login (preserving the intended
// destination). Optionally requires admin role for the /admin/* routes.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RequireAuth({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { token, user, ready } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requireAdmin && ready && user && !user.is_admin) {
    return <Navigate to="/shelf" replace />;
  }
  return <>{children}</>;
}
