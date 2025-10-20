import { memo } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

export const ProtectedRoute = memo<ProtectedRouteProps>(({ children }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = localStorage.getItem('testforge_token');
    
    console.log('[ProtectedRoute] DEBUG:', {
        isAuthenticated,
        hasToken: !!token,
        tokenLength: token?.length,
        location: window.location.pathname
    });

    // TEMPORALMENTE permitir acceso si hay token en localStorage
    const shouldAllow = isAuthenticated || !!token;

    if (!shouldAllow) {
        console.log('[ProtectedRoute] redirecting to /login - no auth and no token');
        return <Navigate to="/login" replace />;
    }

    console.log('[ProtectedRoute] allowing access');
    return children ? <>{children}</> : <Outlet />;
});

ProtectedRoute.displayName = 'ProtectedRoute'; 