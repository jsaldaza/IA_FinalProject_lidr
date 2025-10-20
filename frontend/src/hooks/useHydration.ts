import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useHydration() {
    const init = useAuthStore((state) => state.init);

    useEffect(() => {
        init();
    }, [init]);
} 