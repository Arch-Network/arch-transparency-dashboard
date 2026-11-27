import type { RawPrimeTransparency } from '../../server/theya.js'

// Fixed `/v1/prime-transparency` response for `scripts/check-snapshot.ts`,
// using round numbers so every derived Theya figure can be checked by hand.

export const theyaSourceUrl = 'https://analytics.example/v1/prime-transparency'

export const primeTransparencyFixture: RawPrimeTransparency = {
  computed_at: '2026-11-04T12:30:00Z',
  network: 'mainnet',
  fields: {
    A01: {
      value: '25000',
      status: 'available',
      as_of: '2026-11-04T12:25:00Z',
      notes: [],
    },
    O11: {
      value: '1.5',
      status: 'available',
      as_of: '2026-11-04T12:25:00Z',
      notes: [],
    },
    T01: {
      value: '1000.25000000',
      status: 'available',
      as_of: '2026-11-04T10:00:00Z',
      notes: [
        "Confirmed outputs the indexer's mainnet Bitcoin API reports unspent across the roster's 3614 addresses, read between 2026-11-04T10:00:00Z and 2026-11-04T11:00:00Z (Bitcoin tip 900000 to 900006): a scan over minutes, not one block's state. 2 unconfirmed output(s) are counted in no balance. Whether these addresses also back aBTC is not established.",
      ],
    },
    T02: {
      value: '50012500',
      status: 'available',
      as_of: '2026-11-04T10:00:00Z',
      notes: [],
    },
    // 25,000 aUSD + 75,000 aBTC (1.5 * 50,000) + 50,012,500 Theya BTC + 10,000 aETH/aHYPE = 50,122,500
    O01: {
      value: '50122500',
      status: 'available',
      as_of: '2026-11-04T10:00:00Z',
      notes: [],
    },
    O02: {
      value: '-1.25',
      status: 'available',
      as_of: '2026-11-04T10:00:00Z',
      notes: [],
    },
  },
  metadata: {
    'shared:btc_price': {
      value: '50000',
      status: 'available',
      as_of: '2026-11-04T12:00:00Z',
      notes: [],
    },
    'shared:total_assets_24h_baseline': {
      kind: 'total_assets_historical_valuation_v1',
      estimated: false,
      inputs: {
        'theya:confirmed': {
          value: '1000.00000000',
          source_at: '2026-11-03T10:00:00Z',
        },
      },
    },
  },
  ingestion: [
    {
      job: 'theya',
      status: 'success',
      completed_at: '2026-11-04T11:00:00Z',
    },
  ],
}
