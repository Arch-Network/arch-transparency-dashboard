import type { AnalyticsData, ChartRow } from '../../server/analytics.js'
import { analytics } from './world.js'

// The same invented protocol as an analytics build at data revision 16
// serves it: no loan book, no e-mode settings, no PropAMM column, interest as
// an estimate, and a lending TVL component that counts the vault-share bank,
// so the dashboard rebuilds that component bank by bank.

const day = (d: number) => `2026-11-0${d}T00:00:00Z`
const hour = (d: number, h: number) => `2026-11-0${d}T${String(h).padStart(2, '0')}:00:00Z`
const v = (t: string, value: string): ChartRow => ({ t, v: value })

const withoutPropAmm = (rows: ChartRow[]): ChartRow[] => rows.map((row) => ({ t: row.t, volume_usd: row.volume_usd }))

export const olderAnalytics: AnalyticsData = {
  ...analytics,
  version: { ...analytics.version, data_revision: 16 },
  loanBook: null,
  markets: analytics.markets.map((m) => {
    const { emode: _, ...config } = m.config
    return { ...m, config }
  }),
  volumeDaily: withoutPropAmm(analytics.volumeDaily),
  volumeLastDay: withoutPropAmm(analytics.volumeLastDay),
  legacyTvl: {
    // The banks holding assets that are not vault shares: USD, BTC and ETH.
    liquidity: [
      { priced: true, usd: [v(day(1), '400'), v(day(3), '500'), v(day(4), '600')] },
      { priced: true, usd: [v(day(1), '9000'), v(day(3), '17000'), v(day(4), '20000')] },
      { priced: false, units: [v(day(3), '2'), v(day(4), '2')], oracleDaily: [v(day(3), '1900'), v(day(4), '2000')] },
    ],
    // The vault-share bank's liquidity, which this build's hourly total includes.
    shareBankHourly: [[v(hour(3, 12), '9000'), v(hour(4, 12), '10100')]],
  },
}
