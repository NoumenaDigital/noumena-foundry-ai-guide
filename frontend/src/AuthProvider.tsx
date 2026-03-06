import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import Keycloak from 'keycloak-js';

interface AuthContextValue {
  keycloak: Keycloak | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  keycloak: null,
  authenticated: false,
  loading: true,
  error: null,
  hasRole: () => false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double-initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_NC_KC_REALM;
    const clientId = import.meta.env.VITE_NC_KC_CLIENT_ID;

    if (!keycloakUrl || !realm || !clientId) {
      setError('Missing Keycloak environment variables. Check VITE_KEYCLOAK_URL, VITE_NC_KC_REALM, VITE_NC_KC_CLIENT_ID.');
      setLoading(false);
      return;
    }

    const kc = new Keycloak({
      url: keycloakUrl,
      realm,
      clientId,
    });

    const savedToken = localStorage.getItem('kc-token') || undefined;
    const savedRefreshToken = localStorage.getItem('kc-refresh-token') || undefined;

    const saveTokens = () => {
      if (kc.token) localStorage.setItem('kc-token', kc.token);
      if (kc.refreshToken) localStorage.setItem('kc-refresh-token', kc.refreshToken);
    };

    kc.onAuthSuccess = saveTokens;
    kc.onAuthRefreshSuccess = saveTokens;
    kc.onAuthLogout = () => {
      localStorage.removeItem('kc-token');
      localStorage.removeItem('kc-refresh-token');
    };

    kc.init({
      checkLoginIframe: false,
      pkceMethod: 'S256',
      token: savedToken,
      refreshToken: savedRefreshToken,
    })
      .then((auth) => {
        setKeycloak(kc);
        setAuthenticated(auth);
        setLoading(false);
        if (auth) saveTokens();
      })
      .catch((err) => {
        console.error('Keycloak init failed:', err);
        setError('Authentication service unavailable. Please try again later.');
        setLoading(false);
      });

    // Token refresh
    kc.onTokenExpired = () => {
      kc.updateToken(70).catch(() => {
        console.warn('Token refresh failed — logging out');
        localStorage.removeItem('kc-token');
        localStorage.removeItem('kc-refresh-token');
        kc.logout();
      });
    };
  }, []);

  const hasRole = (role: string): boolean => {
    if (!keycloak?.authenticated) return false;
    return keycloak.hasRealmRole(role);
  };

  return (
    <AuthContext.Provider value={{ keycloak, authenticated, loading, error, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
