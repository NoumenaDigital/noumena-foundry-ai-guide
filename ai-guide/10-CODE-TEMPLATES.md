# 10 - Code Templates

## Overview

This document provides complete, copy-paste ready code templates for all frontend components. Use these as starting points and customize based on your specific NPL protocols.

## Table of Contents

1. [Base CSS Styles](#base-css-styles)
2. [Service Provider](#service-provider)
3. [Router Configuration](#router-configuration)
4. [Page Header Component](#page-header-component)
5. [Data Table Component](#data-table-component)
6. [Complete Overview Page](#complete-overview-page)
7. [Complete Detail Page](#complete-detail-page)
8. [Complete Creation Form](#complete-creation-form)
9. [Complete Action Button](#complete-action-button)

## Base CSS Styles

**File:** `src/index.css`

> ⚠️ **Important:** The colors and styles in this template are examples only. **Update them to match your application's design system and branding guidelines.** Do not use these exact colors in your application without customizing them.

```css
body {
    margin: 0;
    height: 100vh;
    width: 100%;
    font-family: 'Lato', 'Roboto', 'Helvetica', 'Arial', sans-serif;
    background-color: #FFFFFF;
    color: #120A4D;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 0.3s ease, color 0.3s ease;
}

#root {
    height: 100%;
}

* {
    box-sizing: border-box;
}

/* Dark Mode Styles - Update colors to match your theme */
html[data-color-mode="dark"] body {
    background-color: #0F172A;
    color: #F1F5F9;
}

html[data-color-mode="dark"] body #root {
    background: transparent;
}

/* Link styles for light mode - Customize for your brand */
a {
    color: #120A4D;
    text-decoration: none;
    transition: color 0.2s ease;
}

a:hover {
    color: #DD2C8D;
    text-decoration: underline;
}

a:visited {
    color: #A855F7;
}

/* Link styles for dark mode - Customize for your brand */
html[data-color-mode="dark"] a {
    color: #3B82F6;
}

html[data-color-mode="dark"] a:hover {
    color: #60A5FA;
}

html[data-color-mode="dark"] a:visited {
    color: #818CF8;
}
```

## Service Provider

**File:** `src/ServiceProvider.tsx`

> 🚨 **CRITICAL CORNER PRINCIPLE:** JWT Token Must Be Passed with ALL Backend Requests
> 
> **The ServiceProvider MUST add the Authorization header to ALL axios requests using a GLOBAL interceptor.**
> 
> Without the JWT token, you will get 401/503 errors. This is not optional - it's mandatory.

> ⚠️ **CRITICAL:** The ServiceProvider must:
> 1. **MUST:** Use GLOBAL `axios.interceptors.request.use()` (not just local instance) to catch ALL requests
> 2. **MUST:** Use `keycloakRef.current` (not direct `keycloak` prop) to avoid stale closures
> 3. **MUST:** Add `Authorization: Bearer <token>` header to every request
> 4. Set `VITE_ENGINE_URL` to the nginx proxy (port 12001) instead of direct engine (port 12000) for CORS support
> 5. Configure both `OpenAPI.TOKEN` resolver AND axios interceptor for authentication (if using OpenAPI client)
> 6. Use refs to ensure the latest keycloak instance is accessed in async callbacks

```typescript
import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthProvider';
import { DefaultService } from './generated/services/DefaultService';
import { OpenAPI } from './generated/core/OpenAPI';

interface Services {
  api: typeof DefaultService;
}

const ServiceContext = createContext<Services | undefined>(undefined);

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return context;
};

interface ServiceProviderProps {
  children: React.ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const { keycloak } = useAuth();
  const keycloakRef = useRef(keycloak);
  const interceptorIdRef = useRef<number | null>(null);

  // Keep ref updated with latest keycloak instance
  useEffect(() => {
    keycloakRef.current = keycloak;
  }, [keycloak]);

  // IMPORTANT: Use nginx proxy (12001) instead of direct engine (12000) for CORS support
  const engineUrl = import.meta.env.VITE_ENGINE_URL || 'http://localhost:12001';

  // Configure the OpenAPI client base URL, token resolver, and axios interceptor for auth
  useEffect(() => {
    OpenAPI.BASE = engineUrl;
    
    // Configure OpenAPI.TOKEN resolver for the generated client
    // This is called for each request to get the current token
    OpenAPI.TOKEN = async () => {
      const kc = keycloakRef.current;
      if (kc?.authenticated) {
        try {
          await kc.updateToken(70);
          return kc.token || '';
        } catch {
          return kc.token || '';
        }
      }
      return '';
    };
    
    console.log('[ServiceProvider] OpenAPI configured, BASE:', engineUrl);

    // Remove any existing interceptor before adding a new one
    if (interceptorIdRef.current !== null) {
      axios.interceptors.request.eject(interceptorIdRef.current);
    }

    // CRITICAL: Add axios request interceptor to inject Authorization header
    // This interceptor runs for EVERY axios request, ensuring the token is always included
    interceptorIdRef.current = axios.interceptors.request.use(
      async (config) => {
        const kc = keycloakRef.current;

        if (!kc) {
          console.warn('[ServiceProvider] Keycloak instance not available for request:', config.url);
          return config;
        }

        if (!kc.authenticated) {
          console.warn('[ServiceProvider] Keycloak not authenticated for request:', config.url);
          return config;
        }

        try {
          // Ensure token is fresh before making the request
          // Update token if it's about to expire (within 70 seconds)
          const refreshed = await kc.updateToken(70);
          if (refreshed) {
            console.log('[ServiceProvider] Token refreshed successfully');
          }

          const token = kc.token;
          if (token) {
            // Add Authorization header to the request
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            console.log('[ServiceProvider] Authorization header added to request:', config.url);
          } else {
            console.error('[ServiceProvider] No token available from Keycloak');
          }
        } catch (error) {
          console.error('[ServiceProvider] Failed to refresh token:', error);
          // Try to use current token anyway if refresh fails
          const token = kc.token;
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
            console.warn('[ServiceProvider] Using existing token despite refresh failure');
          }
        }

        return config;
      },
      (error) => {
        console.error('[ServiceProvider] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Cleanup: remove interceptor on unmount or when dependencies change
    return () => {
      if (interceptorIdRef.current !== null) {
        axios.interceptors.request.eject(interceptorIdRef.current);
        interceptorIdRef.current = null;
      }
    };
  }, [engineUrl]);

  const services = useMemo<Services>(() => {
    return { api: DefaultService };
  }, []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};
```

### Key Points for ServiceProvider Implementation

**🚨 CRITICAL REQUIREMENTS:**

1. **MUST use GLOBAL axios interceptor** — Add interceptor to `axios.interceptors.request.use()` (global), NOT just `api.interceptors.request.use()` (local instance). This ensures ALL axios requests get the token.
2. **MUST use `keycloakRef.current`** — Never use the `keycloak` prop directly in the interceptor. Use a ref to avoid stale closures: `const kc = keycloakRef.current;`
3. **MUST add Authorization header** — Every request must have: `config.headers.Authorization = 'Bearer ${token}'`
4. **MUST refresh token** — Call `kc.updateToken(70)` before each request to keep token fresh
5. **MUST handle errors gracefully** — If token refresh fails, still try to use existing token

**Additional Requirements:**

6. **Use nginx proxy URL** — Set `VITE_ENGINE_URL` to port 12001 (nginx) instead of 12000 (engine) for CORS support
7. **Set OpenAPI.TOKEN resolver** — The generated client uses this to get the token for each request (if using OpenAPI client)
8. **Cleanup on unmount** — The interceptor is properly removed when the component unmounts

### Why Both OpenAPI.TOKEN and Axios Interceptor?

**Note:** If you're using a custom axios instance (like `api` from `createApiClient`), you should add interceptors to BOTH the global `axios` instance AND your local instance for maximum coverage.

The OpenAPI-generated client (from `openapi-generator-cli`) uses fetch for HTTP requests. We configure both the generated client and axios for maximum reliability:

- **OpenAPI.TOKEN resolver** — Called by the generated client to add Authorization header via its internal `getHeaders()` function
- **GLOBAL Axios interceptor** — Catches ALL axios requests including those made outside the generated client or custom instances

**This dual approach ensures the token is always included regardless of how the request is made.**

**If using a custom axios instance (like `api`), add interceptors to both:**
```typescript
// Global interceptor (catches all axios requests)
axios.interceptors.request.use(...);

// Local instance interceptor (catches requests from this instance)
api.interceptors.request.use(...);
```

### CORS Configuration

The frontend must communicate through the nginx proxy (port 12001) which adds CORS headers. Direct access to the engine (port 12000) will result in CORS errors because the engine has strict cross-origin filtering.

Configure via docker-compose environment variables:
```yaml
frontend:
  environment:
    VITE_ENGINE_URL: http://localhost:12001  # nginx proxy, NOT 12000
```

## Router Configuration

**File:** `src/Router.tsx`

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import Layout from './components/shared/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { RoleProtectedRoute } from './components/shared/RoleProtectedRoute';
import { PageNotFound } from './components/shared/PageNotFound';

const LoadingSpinner = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component />
  </Suspense>
);

// Lazy load overview pages
const ProtocolNameOverview = lazy(() => 
  import('./components/overview-pages/ProtocolNameOverview')
    .then(m => ({ default: m.ProtocolNameOverview }))
);

// Lazy load detail pages
const ProtocolNameDetailPage = lazy(() => 
  import('./components/detail-pages/ProtocolNameDetailPage')
    .then(m => ({ default: m.ProtocolNameDetailPage }))
);

// Lazy load creation forms
const ProtocolNameCreationForm = lazy(() => 
  import('./components/creation-forms/ProtocolNameCreationForm')
    .then(m => ({ default: m.ProtocolNameCreationForm }))
);

export const router = () => {
  return createBrowserRouter([
    {
      element: <Layout />,
      children: [
        {
          path: '/',
          element: <Navigate to="/protocol-name-overview" replace />
        },
        {
          path: '/protocol-name-overview',
          element: <ProtectedRoute>{withSuspense(ProtocolNameOverview)}</ProtectedRoute>
        },
        {
          path: '/protocol-name-detail/:id',
          element: <ProtectedRoute>{withSuspense(ProtocolNameDetailPage)}</ProtectedRoute>
        },
        {
          path: '/protocol-name-create',
          element: <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
            {withSuspense(ProtocolNameCreationForm)}
          </RoleProtectedRoute>
        },
        {
          path: '*',
          element: <PageNotFound />
        }
      ]
    }
  ]);
};
```

## Page Header Component

**File:** `src/components/shared/PageHeader.tsx`

See the actual implementation in the codebase. Key features:
- Three variants: `detail`, `overview`, `form`
- Breadcrumbs for navigation
- Action buttons area
- Live updates indicator
- State chips

## Data Table Component

**File:** `src/components/shared/DataTable.tsx`

See the actual implementation in the codebase. Key features:
- Search functionality
- Sorting
- Pagination
- Filtering
- Row selection
- Clickable rows

## Complete Overview Page Template

**File:** `src/components/overview-pages/ProtocolNameOverview.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Search, Add } from '@mui/icons-material';
import { useServices } from '../../ServiceProvider';
import { useAuth } from '../../hooks/useAuth';
import { useProtocolSSE } from '../../hooks/useProtocolSSE';
import { ProtocolUpdateEvent } from '../../services/SSEService';
import { PageHeader } from '../shared/PageHeader';
import { ProtocolName } from '../../generated/models';

interface ProtocolDisplay {
  id: string;
  name: string;
  state: string;
  // Add other display fields
}

export const ProtocolNameOverview: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const services = useServices();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<ProtocolDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!services?.api) {
        throw new Error('Services not available');
      }

      const response = await services.api.getProtocolNameList({
        page: 1,
        pageSize: 100,
        includeCount: true
      });

      const transformed: ProtocolDisplay[] = response.items.map((protocol: ProtocolName) => ({
        id: protocol.id,
        name: protocol.name,
        state: protocol.state,
        // Map other fields...
      }));

      setProtocols(transformed);
    } catch (e) {
      console.error('Failed to fetch protocols:', e);
      setError('Failed to load protocols. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProtocolUpdate = useCallback(async (event: ProtocolUpdateEvent) => {
    if (!services?.api) return;

    try {
      const protocolRes = await services.api.getProtocolNameByID({ id: event.protocolId });
      
      if (protocolRes) {
        const transformed: ProtocolDisplay = {
          id: protocolRes.id,
          name: protocolRes.name,
          state: protocolRes.state,
        };
        
        setProtocols(prev => {
          const existingIndex = prev.findIndex(p => p.id === event.protocolId);
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = transformed;
            return updated;
          } else {
            return [...prev, transformed];
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch updated protocol:', error);
    }
  }, [services?.api]);

  const { isConnected, lastUpdate } = useProtocolSSE(['ProtocolName'], handleProtocolUpdate);

  const filteredProtocols = protocols.filter(protocol =>
    protocol.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'created': return 'default';
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'closed': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <PageHeader
        variant="overview"
        title="Protocol Name Overview"
        subtitle="Manage and monitor all protocol instances"
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        primaryAction={
          hasRole('admin') ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/protocol-name-create')}
            >
              Create New Protocol
            </Button>
          ) : undefined
        }
      />

      <Card sx={{ marginBottom: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              placeholder="Search protocols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {filteredProtocols.length} of {protocols.length} protocols
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : theme.palette.grey[50] 
                }}>
                  <TableCell>Name</TableCell>
                  <TableCell>State</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProtocols.map((protocol) => (
                  <TableRow 
                    key={protocol.id} 
                    hover
                    onClick={() => navigate(`/protocol-name-detail/${protocol.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {protocol.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={protocol.state.charAt(0).toUpperCase() + protocol.state.slice(1)} 
                        color={getStatusColor(protocol.state) as any}
                        size="small" 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
```

## Complete Detail Page Template

See [04-DETAIL-PAGES.md](./04-DETAIL-PAGES.md) for the complete template with section generation from NPL comments.

## Complete Creation Form Template

See [05-CREATION-FORMS.md](./05-CREATION-FORMS.md) for the complete template with field generation from protocol parameters.

## Complete Action Button Template

See [06-ACTION-BUTTONS.md](./06-ACTION-BUTTONS.md) for complete templates for both simple and parameterized action buttons.

## Core Infrastructure Files

### Runtime Configuration Provider

**File:** `src/RuntimeConfigurationProvider.tsx`

```typescript
import React, { createContext, useContext } from 'react';

export type DeploymentTarget = 'LOCAL' | 'NOUMENA_CLOUD';

export interface RuntimeConfiguration {
  apiBaseUrl: string;
  authUrl: string;
  realm: string;
  clientId: string;
  deploymentTarget: DeploymentTarget;
}

const RuntimeConfigContext = createContext<RuntimeConfiguration | null>(null);

export const useRuntimeConfiguration = (): RuntimeConfiguration => {
  const context = useContext(RuntimeConfigContext);
  if (!context) {
    throw new Error('useRuntimeConfiguration must be used within a RuntimeConfigurationProvider');
  }
  return context;
};

export const loadRuntimeConfiguration = (): RuntimeConfiguration => {
  const deploymentTarget = 
    (import.meta.env.VITE_DEPLOYMENT_TARGET as DeploymentTarget) || 'LOCAL';
  
  const tenantSlug = import.meta.env.VITE_NC_ORG_NAME;
  const appSlug = import.meta.env.VITE_NC_APP_SLUG;
  // VITE_NC_KC_REALM is hardcoded in docker-compose.yml (equals the app slug)
  const kcRealm = import.meta.env.VITE_NC_KC_REALM || 'seed';

  let config: RuntimeConfiguration = {
    apiBaseUrl: 'http://localhost:12001',
    authUrl: 'http://localhost:11000',
    realm: kcRealm,
    clientId: kcRealm,
    deploymentTarget
  };

  if (deploymentTarget === 'NOUMENA_CLOUD') {
    config.apiBaseUrl = 
      import.meta.env.VITE_CLOUD_API_URL || 
      `https://engine-${tenantSlug}-${appSlug}.noumena.cloud`;
    
    config.authUrl = 
      import.meta.env.VITE_CLOUD_KC_URL || 
      `https://keycloak-${tenantSlug}-${appSlug}.noumena.cloud`;
  } else {
    config.apiBaseUrl = 
      import.meta.env.VITE_LOCAL_API_URL || 
      'http://localhost:12001';
    
    config.authUrl = 
      import.meta.env.VITE_LOCAL_KC_URL || 
      'http://localhost:11000';
  }

  return config;
};

interface RuntimeConfigurationProviderProps {
  children: React.ReactNode;
}

export const RuntimeConfigurationProvider: React.FC<RuntimeConfigurationProviderProps> = ({ children }) => {
  const config = loadRuntimeConfiguration();
  
  return (
    <RuntimeConfigContext.Provider value={config}>
      {children}
    </RuntimeConfigContext.Provider>
  );
};
```

### Auth Provider

**File:** `src/AuthProvider.tsx`

> ⚠️ **CRITICAL:** This implementation prevents redirect loops by using:
> - `initializingRef` to prevent double initialization from React StrictMode
> - `silentCheckSsoRedirectUri` pointing to `/silent-check-sso.html`
> - Login redirect handled directly in the init callback (not in a separate useEffect)

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Keycloak from 'keycloak-js';
import { Box, CircularProgress, Typography } from '@mui/material';

interface AuthContextType {
  keycloak: Keycloak | null;
  authenticated: boolean;
  token: string | undefined;
  login: () => void;
  logout: () => void;
  userInfo: UserInfo | null;
}

interface UserInfo {
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // CRITICAL: Prevent double initialization from React StrictMode
  const initializingRef = useRef(false);

  const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://keycloak:11000';
  // VITE_NC_KC_REALM and VITE_NC_KC_CLIENT_ID are hardcoded in docker-compose.yml (= app slug)
  const realm = import.meta.env.VITE_NC_KC_REALM || 'your-realm';
  const clientId = import.meta.env.VITE_NC_KC_CLIENT_ID || 'your-client';

  useEffect(() => {
    // Prevent double initialization (React StrictMode calls effects twice)
    if (initializingRef.current) {
      return;
    }
    initializingRef.current = true;

    const kc = new Keycloak({
      url: keycloakUrl,
      realm: realm,
      clientId: clientId,
    });

    let refreshInterval: NodeJS.Timeout | null = null;

    // Listen to Keycloak events to update authentication state
    kc.onAuthSuccess = () => {
      console.log('[AuthProvider] Keycloak auth success');
      setAuthenticated(true);
      if (kc.tokenParsed) {
        const roles = kc.tokenParsed.realm_access?.roles || [];
        setUserInfo({
          email: kc.tokenParsed.email,
          name: kc.tokenParsed.name,
          preferred_username: kc.tokenParsed.preferred_username,
          roles: roles,
        });
      }
    };

    kc.onAuthError = () => {
      console.error('[AuthProvider] Keycloak auth error');
      setAuthenticated(false);
    };

    kc.onTokenExpired = () => {
      console.log('[AuthProvider] Keycloak token expired, refreshing...');
      kc.updateToken(70).catch(() => {
        console.error('[AuthProvider] Failed to refresh expired token');
        setAuthenticated(false);
      });
    };

    // CRITICAL: Use 'check-sso' instead of 'login-required' to avoid redirect loops
    // silentCheckSsoRedirectUri requires the silent-check-sso.html file in public/
    kc.init({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
    })
      .then((auth) => {
        console.log('[AuthProvider] Keycloak init complete, authenticated:', auth);
        setKeycloak(kc);
        setAuthenticated(auth);

        if (auth && kc.tokenParsed) {
          const roles = kc.tokenParsed.realm_access?.roles || [];
          setUserInfo({
            email: kc.tokenParsed.email,
            name: kc.tokenParsed.name,
            preferred_username: kc.tokenParsed.preferred_username,
            roles: roles,
          });

          // Set up token refresh
          refreshInterval = setInterval(() => {
            kc.updateToken(70)
              .then((refreshed) => {
                if (refreshed) {
                  console.log('Token refreshed');
                }
              })
              .catch(() => {
                console.error('Failed to refresh token');
                kc.logout();
              });
          }, 60000);
        } else if (!auth) {
          // CRITICAL: Login redirect happens here, NOT in a separate useEffect
          // This prevents redirect loops from effect re-runs
          console.log('[AuthProvider] Not authenticated, redirecting to login...');
          kc.login({
            redirectUri: window.location.href,
          });
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error('Keycloak init failed:', error);
        setLoading(false);
      });

    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [keycloakUrl, realm, clientId]);

  const login = useCallback(() => {
    keycloak?.login();
  }, [keycloak]);

  const logout = useCallback(() => {
    keycloak?.logout({ redirectUri: window.location.origin });
  }, [keycloak]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} color="primary" />
        <Typography variant="body1" color="text.secondary">
          Authenticating...
        </Typography>
      </Box>
    );
  }

  if (!authenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} color="primary" />
        <Typography variant="body1" color="text.secondary">
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        keycloak,
        authenticated,
        token: keycloak?.token,
        login,
        logout,
        userInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

### Key Points for AuthProvider Implementation

1. **Use `initializingRef`** — Prevents React StrictMode from initializing Keycloak twice
2. **Use `check-sso` mode** — Never use `login-required` as it causes redirect loops
3. **Handle login in init callback** — Do NOT use a separate `useEffect` for login redirect
4. **Requires `silent-check-sso.html`** — See "Keycloak Silent SSO File" section in 04-FRONTEND-SETUP.md
5. **Use `silentCheckSsoRedirectUri`** — Points to the silent-check-sso.html file

### User Provider

**File:** `src/UserProvider.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { Box, CircularProgress } from '@mui/material';
import { KeycloakTokenParsed } from 'keycloak-js';

export interface User {
  name: string;
  email: string;
}

const UserContext = createContext<User | null>(null);

export const useMe = (): User | null => {
  const user = useContext(UserContext);
  return user;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (initialized && keycloak?.tokenParsed) {
      internalizeUser(keycloak.tokenParsed).then((it) => setUser(it));
    }
  }, [keycloak, initialized]);

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
};

const internalizeUser = async (tokenParsed: KeycloakTokenParsed): Promise<User> => {
  if (tokenParsed.name && tokenParsed.email) {
    return {
      name: tokenParsed.name as string,
      email: tokenParsed.email as string,
    };
  } else {
    throw Error(
      `unable to parse user from ${(tokenParsed.name, tokenParsed.email, tokenParsed.company)}`
    );
  }
};
```

### Currency Provider

**File:** `src/CurrencyProvider.tsx`

See the actual implementation in the codebase. Key features:
- Global currency cache
- Preloads all currencies on mount
- Provides `resolveCurrencyCode`, `formatCurrencyAmount`, `getCurrencyISOCode`
- Async and sync resolution methods

### Theme Context

**File:** `src/ThemeContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ColorMode = 'light' | 'dark'

interface ThemeContextType {
    colorMode: ColorMode
    toggleColorMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'app-color-mode'

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [colorMode, setColorMode] = useState<ColorMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ColorMode | null
        if (stored === 'light' || stored === 'dark') {
            return stored
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark'
        }
        return 'light'
    })

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, colorMode)
        document.documentElement.setAttribute('data-color-mode', colorMode)
    }, [colorMode])

    const toggleColorMode = () => {
        setColorMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
    }

    return (
        <ThemeContext.Provider value={{ colorMode, toggleColorMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useColorMode = (): ThemeContextType => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useColorMode must be used within a ThemeProvider')
    }
    return context
}
```

### Main Entry Point

**File:** `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n';
import { createAppTheme } from './theme';
import { RuntimeConfigurationProvider } from './RuntimeConfigurationProvider';
import { AuthProvider } from './AuthProvider';
import { ServiceProvider } from './ServiceProvider';
import { CurrencyProvider } from './CurrencyProvider';
import { UserProvider } from './UserProvider';
import { router } from './Router';
import { ThemeProvider, useColorMode } from './ThemeContext';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const ThemedApp = () => {
  const { colorMode } = useColorMode();
  const theme = createAppTheme(colorMode);
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router()} />
    </MuiThemeProvider>
  );
};

export const StructuredProductApp = () => {
  return (
    <React.StrictMode>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <RuntimeConfigurationProvider>
      <AuthProvider>
        <ServiceProvider>
          <CurrencyProvider>
            <UserProvider>
              <StructuredProductApp />
            </UserProvider>
          </CurrencyProvider>
        </ServiceProvider>
      </AuthProvider>
    </RuntimeConfigurationProvider>
  </ErrorBoundary>
);
```

## Shared Components

### Layout

**File:** `src/components/shared/Layout.tsx`

```typescript
import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import { ErrorBoundary } from './ErrorBoundary';

const Layout: React.FC = () => {
  return (
    <ErrorBoundary>
      <SidebarNavigation>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </SidebarNavigation>
    </ErrorBoundary>
  );
};

export default Layout;
```

### Protected Route

**File:** `src/components/shared/ProtectedRoute.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';
import { logger } from '../../utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, getToken, isLoading, login, keycloak } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !getToken() || (keycloak && keycloak.isTokenExpired()))) {
      if (!hasRedirected.current) {
        logger.debug('User not authenticated or token expired, redirecting to Keycloak login');
        hasRedirected.current = true;
        login();
      }
    }
  }, [isLoading, isAuthenticated, getToken, keycloak, login]);

  if (isLoading || (!isAuthenticated || !getToken() || (keycloak && keycloak.isTokenExpired()))) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};
```

### Role Protected Route

**File:** `src/components/shared/RoleProtectedRoute.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { CircularProgress, Box, Alert } from '@mui/material';
import { logger } from '../../utils/logger';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/' 
}) => {
  const { isAuthenticated, getToken, isLoading, hasRole, login, keycloak } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !getToken() || (keycloak && keycloak.isTokenExpired()))) {
      if (!hasRedirected.current) {
        logger.debug('User not authenticated or token expired, redirecting to Keycloak login');
        hasRedirected.current = true;
        login();
      }
    }
  }, [isLoading, isAuthenticated, getToken, keycloak, login]);

  if (isLoading || (!isAuthenticated || !getToken() || (keycloak && keycloak.isTokenExpired()))) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  const hasAllowedRole = allowedRoles.some(role => hasRole(role));

  if (!hasAllowedRole) {
    logger.warn('User does not have required roles', { requiredRoles: allowedRoles });
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page. Required roles: {allowedRoles.join(', ')}
        </Alert>
        <Navigate to={fallbackPath} replace />
      </Box>
    );
  }

  return <>{children}</>;
};
```

### Error Boundary

**File:** `src/components/shared/ErrorBoundary.tsx`

See the actual implementation in the codebase. Key features:
- Catches React errors
- Displays fallback UI
- Logs errors (sanitized)
- Reset functionality

### Error Fallback

**File:** `src/components/shared/ErrorFallback.tsx`

See the actual implementation in the codebase. Key features:
- User-friendly error display
- Try again button
- Error details (dev only)

### Page Not Found

**File:** `src/components/shared/PageNotFound.tsx`

See the actual implementation in the codebase. Key features:
- 404 page
- Back button
- Home navigation

### Live Updates Indicator

**File:** `src/components/shared/LiveUpdatesIndicator.tsx`

See the actual implementation in the codebase. Key features:
- SSE connection status
- Last update timestamp
- Clickable for detail pages (toggle auto-refresh)

## Hooks

### useAuth

**File:** `src/hooks/useAuth.ts`

```typescript
import { useKeycloak } from '@react-keycloak/web';
import { useMe } from '../UserProvider';

export const useAuth = () => {
  const { keycloak, initialized } = useKeycloak();
  const user = useMe();

  const hasValidToken = keycloak?.token && !keycloak?.isTokenExpired();
  const isAuthenticated = initialized && keycloak?.authenticated && hasValidToken;
  const isLoading = !initialized || !user;
  const hasRole = (role: string) => keycloak?.hasRealmRole(role) || false;
  const hasAnyRole = (roles: string[]) => roles.some(role => hasRole(role));
  const hasAllRoles = (roles: string[]) => roles.every(role => hasRole(role));

  const login = () => keycloak?.login({ redirectUri: window.location.origin + '/' });
  const logout = () => keycloak?.logout({ redirectUri: window.location.origin });
  const getToken = () => keycloak?.token;

  return {
    isAuthenticated,
    isLoading,
    user,
    keycloak,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    login,
    logout,
    getToken,
  };
};
```

### useProtocolSSE

**File:** `src/hooks/useProtocolSSE.ts`

See the actual implementation in the codebase. Key features:
- Subscribes to protocol updates via SSE
- Handles reconnection
- Filters by protocol types and ID
- Returns connection status and last update

### useTable

**File:** `src/hooks/useTable.ts`

See the actual implementation in the codebase. Key features:
- Pagination
- Sorting
- Search
- Filtering
- Returns paginated, sorted, filtered data

## Utilities

### Number Utils

**File:** `src/utils/numberUtils.ts`

See the actual implementation in the codebase. Key functions:
- `formatCurrency(amount, currency)` - Format with 4 decimal places
- `formatPercentage(value)` - Format as percentage
- `formatNumber(value)` - Format with 2 decimal places
- `formatLargeNumber(value, currency)` - Format with K/M/B/T units
- `normalizeNumberInput(value)` - Remove leading zeros
- `formatNumberInput(value, decimalPlaces)` - Format with thousand separators
- `parseFormattedNumber(value)` - Parse formatted string back to number

### Error Utils

**File:** `src/utils/errorUtils.ts`

```typescript
import { AxiosError } from 'axios';

interface ErrorWithResponse {
  response?: {
    status?: number;
  };
}

interface ErrorWithStatus {
  status?: number;
}

function hasResponse(error: unknown): error is ErrorWithResponse {
  return typeof error === 'object' && error !== null && 'response' in error;
}

function hasStatus(error: unknown): error is ErrorWithStatus {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401 || error.response?.status === 403;
  }
  if (hasResponse(error)) {
    const status = error.response?.status;
    return status === 401 || status === 403;
  }
  if (hasStatus(error)) {
    return error.status === 401 || error.status === 403;
  }
  return false;
}

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 404;
  }
  if (hasResponse(error)) {
    return error.response?.status === 404;
  }
  if (hasStatus(error)) {
    return error.status === 404;
  }
  return false;
}

export function getErrorStatus(error: unknown): number | null {
  if (error instanceof AxiosError) {
    return error.response?.status || null;
  }
  if (hasResponse(error)) {
    return error.response?.status || null;
  }
  if (hasStatus(error)) {
    return error.status || null;
  }
  return null;
}
```

### Currency Amount Utils

**File:** `src/utils/currencyAmountUtils.ts`

See the actual implementation in the codebase. Key functions:
- `resolveCurrencyCode(currency, cache?, fetch?)` - Resolve to ISO code
- `resolveCurrencyCodeAsync(currency, cache, fetch)` - Async resolution
- `getCurrencyISOCode(currencyAmount, cache?, fetch?)` - Extract ISO code
- `formatCurrencyAmount(currencyAmount, cache?, fetch?)` - Format for display
- `getAmountValue(currencyAmount)` - Extract amount value
- `isSameCurrency(a, b)` - Check if same currency
- `extractCurrencyIds(currencyAmounts)` - Extract IDs for preloading

### Logger

**File:** `src/utils/logger.ts`

See the actual implementation in the codebase. Key features:
- Environment-aware logging (dev vs production)
- Automatic sensitive data filtering
- Structured logging with context
- API error logging

## Services

### SSE Service

**File:** `src/services/SSEService.ts`

See the actual implementation in the codebase. Key features:
- Server-Sent Events connection management
- Protocol update subscriptions
- Currency update subscriptions
- Automatic reconnection
- Event filtering by protocol type and ID

## i18n Configuration

**File:** `src/i18n/index.ts`

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Translation files
import enTranslations from './locales/en.json'
import deTranslations from './locales/de.json'

const resources = {
  en: {
    translation: enTranslations
  },
  de: {
    translation: deTranslations
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n
```

## Theme Configuration

**File:** `src/theme.ts`

See the actual implementation in the codebase. Key features:
- NOUMENA Corporate Design 2025 colors
- Light and dark mode support
- Custom gradients
- Material-UI component overrides
- Typography configuration

## Next Steps

Once you have all templates, proceed to:
- [00-STEP-BY-STEP.md](./00-STEP-BY-STEP.md) - Complete step-by-step generation workflow

