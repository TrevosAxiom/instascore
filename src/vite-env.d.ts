/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTASCORE_API_BASE?: string;
  readonly VITE_INSTASCORE_APP_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
