/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_LOGIN?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_MAP_PROVIDER?: string;
  readonly VITE_MAP_PROVIDER_API_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
