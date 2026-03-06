import React, { createContext, useContext, ReactNode } from 'react';
import type Keycloak from 'keycloak-js';
import { OpenAPI } from './generated/core/OpenAPI';
import { DefaultService } from './generated/services/DefaultService';
import { useAuth } from './AuthProvider';

// Set BASE at module level — before any component renders
OpenAPI.BASE = import.meta.env.VITE_ENGINE_URL || 'http://localhost:12001';

// _keycloak is updated synchronously in render body (parents render before children)
let _keycloak: Keycloak | null = null;

OpenAPI.TOKEN = async () => {
  const kc = _keycloak;
  if (!kc?.authenticated) return '';
  try {
    await kc.updateToken(70);
  } catch {
    // keep current token if refresh fails
  }
  return kc.token || '';
};

interface ServicesContextValue {
  api: typeof DefaultService;
}

const ServicesContext = createContext<ServicesContextValue>({
  api: DefaultService,
});

export function useServices(): ServicesContextValue {
  return useContext(ServicesContext);
}

export function ServiceProvider({ children }: { children: ReactNode }) {
  const { keycloak } = useAuth();

  // Update synchronously in render body — NOT in useEffect
  // This ensures the token is available before any child component fires an API call
  _keycloak = keycloak;

  return (
    <ServicesContext.Provider value={{ api: DefaultService }}>
      {children}
    </ServicesContext.Provider>
  );
}
