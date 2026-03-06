/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NC_KC_REALM: string;
  readonly VITE_NC_KC_CLIENT_ID: string;
  readonly VITE_ENGINE_URL: string;
  readonly VITE_KEYCLOAK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
