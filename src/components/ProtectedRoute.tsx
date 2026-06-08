import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, loadCurrentUser, loading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!user && isAuthenticated) {
      loadCurrentUser();
    }
  }, [isAuthenticated, user, loadCurrentUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/tickets" replace />;
  }

  return <>{children}</>;
}
