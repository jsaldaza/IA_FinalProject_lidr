import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function useProtectedRoute() {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useAuthStore();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            console.log('🔒 useProtectedRoute: Redirecting to login - not authenticated');
            navigate('/login', { replace: true });
        }
    }, [loading, isAuthenticated, navigate]);

    return { loading, isAuthenticated };
} 