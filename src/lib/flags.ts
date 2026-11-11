// ArchUSD feature flag: on by default. Set VITE_FEATURE_ARCHUSD=false at build
// time to hide the ArchUSD page.
export const ARCHUSD_ENABLED = import.meta.env.VITE_FEATURE_ARCHUSD !== 'false'
