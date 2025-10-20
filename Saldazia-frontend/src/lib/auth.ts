// Centralized token helper: prefer sessionStorage, fallback to localStorage
const AUTH_TOKEN_KEY = 'testforge_token';

export function setToken(token: string, persist = false) {
    try {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        if (persist) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
        }
    } catch (e) {
        // Storage might be unavailable in some environments
        console.warn('Could not store token in storage', e);
    }
}

export function removeToken() {
    try {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
        console.warn('Could not remove token from storage', e);
    }
}

export function getToken(): string | null {
    try {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY) || null;
    } catch (e) {
        console.warn('Could not access storage to get token', e);
        return null;
    }
}

export default { getToken, setToken, removeToken };
 