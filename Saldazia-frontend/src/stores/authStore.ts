import { create } from 'zustand';
import { auth } from '../lib/api';
import type { User } from '../types/api';

// Constants
const TOKEN_KEY = 'testforge_token';

// Types
interface AuthState {
    // State
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    
    // Actions
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    init: () => void;
}

// Note: login response shapes vary (envelope {data:{}} or plain object). We'll narrow at runtime.

// Utility functions - SECURE TOKEN STORAGE
const setTokenInStorage = (token: string): void => {
    // Use sessionStorage for better security (cleared when tab closes)
    // In production, consider using httpOnly cookies instead
    sessionStorage.setItem(TOKEN_KEY, token);
    
    // Keep localStorage as fallback for compatibility
    localStorage.setItem(TOKEN_KEY, token);
    
    console.log('🔐 Token stored securely');
};

const removeTokenFromStorage = (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    console.log('🔐 Token removed from storage');
};

const getTokenFromStorage = (): string | null => {
    // Try sessionStorage first, then localStorage as fallback
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
};

export const useAuthStore = create<AuthState>()((set, get) => ({
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    
    // Login action
    login: async (email: string, password: string) => {
        try {
            set({ loading: true, error: null });

            // The backend sometimes returns an envelope { status, data: { user, token } }
            // but our client helpers often unwrap responses and return { user, token } directly.
            // Handle both shapes defensively to avoid destructuring undefined.
            const respUnknown = await auth.login({ email, password }) as unknown;

            let token: string | undefined;
            let user: User | undefined;

            if (respUnknown && typeof respUnknown === 'object') {
                const respObj = respUnknown as Record<string, unknown>;
                if ('data' in respObj && respObj.data && typeof respObj.data === 'object') {
                    const dataObj = respObj.data as Record<string, unknown>;
                    token = (dataObj.token as string | undefined) ?? undefined;
                    user = (dataObj.user as User | undefined) ?? undefined;
                } else {
                    token = (respObj.token as string | undefined) ?? undefined;
                    user = (respObj.user as User | undefined) ?? undefined;
                }
            }

            if (!token || !user) {
                // Log a safe, non-sensitive error and throw a user-friendly message
                console.error('Login: unexpected response shape', { resp: respUnknown });
                throw new Error('Invalid login response from server');
            }

            setTokenInStorage(token);
            set({
                user,
                token,
                isAuthenticated: true,
                loading: false,
                error: null
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            set({
                loading: false,
                error: errorMessage,
                isAuthenticated: false,
                user: null,
                token: null
            });
            removeTokenFromStorage();
            throw error;
        }
    },
    
    // Logout action
    logout: async () => {
        try {
            // Try to logout from backend
            await auth.logout();
        } catch (error) {
            // Even if backend logout fails, clear local state
            console.warn('Backend logout failed:', error);
        } finally {
            removeTokenFromStorage();
            set({ 
                user: null, 
                token: null, 
                isAuthenticated: false,
                loading: false,
                error: null
            });
        }
    },
    
    // Check authentication status
    checkAuth: async () => {
        try {
            set({ loading: true, error: null });
            
            const token = getTokenFromStorage();

            if (!token) {
                set({
                    loading: false,
                    isAuthenticated: false,
                    user: null,
                    token: null
                });
                return;
            }

            // Validate token with backend. auth.getProfile() may return the user directly
            // or an envelope like { status, data: user } depending on wrapper behavior.
            const profileUnknown = await auth.getProfile() as unknown;
            const profileObj = (profileUnknown && typeof profileUnknown === 'object') ? (profileUnknown as Record<string, unknown>) : null;
            const user = profileObj && 'data' in profileObj && typeof profileObj.data === 'object' ? (profileObj.data as User | undefined) : (profileUnknown as User | undefined);

            if (!user) {
                throw new Error('Invalid user data received');
            }

            set({
                user: user as User,
                token: token as string,
                isAuthenticated: true,
                loading: false,
                error: null
            });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';
            
            removeTokenFromStorage();
            set({ 
                user: null, 
                token: null, 
                isAuthenticated: false, 
                loading: false,
                error: errorMessage
            });
        }
    },
    
    // Clear error
    clearError: () => {
        set({ error: null });
    },
    
    // Initialize store
    init: () => {
        const { checkAuth } = get();
        checkAuth();
    }
})); 