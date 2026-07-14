// ArchUSD feature flag (build handoff §3): ON by default so it is reviewable;
// set VITE_FEATURE_ARCHUSD=false at build time to hide the tab AND the
// ArchUSD-derived elements on the Revenue & Flywheel tab (retention health row,
// ArchUSD yield line on the Incentives & Subsidy node).
export const ARCHUSD_ENABLED = import.meta.env.VITE_FEATURE_ARCHUSD !== 'false'
