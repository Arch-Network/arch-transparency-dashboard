/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_ARCHUSD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
