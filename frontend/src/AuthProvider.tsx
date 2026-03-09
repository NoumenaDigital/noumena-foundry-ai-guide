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

    const savedToken = localStorage.getItem('kc-token') || undefined;
    const savedRefreshToken = localStorage.getItem('kc-refresh-token') || undefined;
    const clearStoredTokens = () => {
      localStorage.removeItem('kc-token');
      localStorage.removeItem('kc-refresh-token');
    };

    const buildClient = () => new Keycloak({ url: keycloakUrl, realm, clientId });

    const bindClientHandlers = (client: Keycloak) => {
      const saveTokens = () => {
        if (client.token) localStorage.setItem('kc-token', client.token);
        if (client.refreshToken) localStorage.setItem('kc-refresh-token', client.refreshToken);
      };

      client.onAuthSuccess = saveTokens;
      client.onAuthRefreshSuccess = saveTokens;
      client.onAuthRefreshError = () => {
        clearStoredTokens();
      };
      client.onAuthLogout = () => {
        clearStoredTokens();
        setAuthenticated(false);
        setError(null);
      };
      client.onTokenExpired = () => {
        client.updateToken(70).catch(() => {
          console.warn('Token refresh failed — clearing local session');
          clearStoredTokens();
          client.clearToken();
          setAuthenticated(false);
        });
      };
    };

    const baseInitOptions = {
      checkLoginIframe: false,
      pkceMethod: 'S256' as const,
    };

    const finishInit = (client: Keycloak, auth: boolean) => {
      setKeycloak(client);
      setAuthenticated(auth);
      setError(null);
      setLoading(false);
    };

    const failInit = (err: unknown) => {
      console.error('Keycloak init failed:', err);
      setError('Authentication service unavailable. Please try again later.');
      setLoading(false);
    };

    const kc = buildClient();
    bindClientHandlers(kc);

    kc.init({
      ...baseInitOptions,
      token: savedToken,
      refreshToken: savedRefreshToken,
    })
      .then((auth) => finishInit(kc, auth))
      .catch((err) => {
        // Common after logout/session expiry: refresh token exists locally but server session is gone.
        if (savedToken || savedRefreshToken) {
          console.warn('Stored Keycloak tokens are stale, retrying clean init.');
          clearStoredTokens();
          const freshClient = buildClient();
          bindClientHandlers(freshClient);
          freshClient.init(baseInitOptions)
            .then((auth) => finishInit(freshClient, auth))
            .catch(failInit);
          return;
        }
        failInit(err);
      });
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
