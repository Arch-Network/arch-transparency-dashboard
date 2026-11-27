import type { PerpsMarketClass, PerpsUnderlying } from '../data/perps.js'

// Classification of Arch Perps markets into Crypto vs TradFi (and finer
// underlying category), matching `apps/web-v2/features/perps/market-class.ts`
// in `arch-prime` (from Binance `exchangeInfo` contractType and launch
// announcements). A symbol not in either set returns `null` rather than
// guessing — fail closed.

const CRYPTO: ReadonlySet<string> = new Set([
  'BTC', 'ETH', 'SOL', 'ZEC', 'MMT', 'XRP', 'PIEVERSE', 'HYPE', 'EVAA', 'NEAR', 'BNB', 'IRYS', 'DOGE', 'ENA', 'ADA',
  'ICNT', 'BTW', 'SUI', 'UNI', 'PAXG', 'BREV', 'NAORIS', 'VELVET', 'AAVE', 'LINK', '1000LUNC', 'INJ', 'AVAX', 'WLD',
  'TAO', 'SENT', 'FIL', 'ZKC', 'INIT', 'ASTER', 'ARB', 'OP', 'ONDO', 'JUP',
])

const TRADFI: ReadonlySet<string> = new Set([
  'SOXL', 'XAU', 'SNDK', 'SPCX', 'NVDA', 'SOXS', 'ANT', 'SKHYNIX', 'MU', 'XAG', 'KORU', 'CL', 'SKHY', 'QQQ', 'SNXX',
  'BZ', 'AMD', 'TQQQ', 'INTC', 'GOOGL', 'MSTR', 'SPY', 'MUU', 'NBIS', 'EWY', 'DRAM', 'TSLA', 'SAMSUNG', 'CRCL', 'MRVL',
  'AAPL', 'NATGAS', 'SQQQ', 'META', 'LITE', 'MVLL', 'CRWV', 'ZHONGJI', 'BABA', 'MSFT', 'AVGO', 'PLTR', 'TSM', 'COIN',
  'INTW', 'BITO', 'AMZN', 'TTWO', 'CBRS', 'ZHIPU', 'BE', 'COHR', 'AAOI', 'AXTI', 'RKLB', 'COPPER', 'CSOPSKHYNIX2L',
  'IREN', 'MINIMAX', 'UNITREE', 'HOOD', 'UVXY', 'ARM', 'BMNR', 'WDC', 'SKDD', 'SKUU', 'ORCL', 'PANW', 'STRC', 'OPENAI',
  'HK0700', 'QCOM', 'CXMT', 'XPT', 'DELL', 'MSTU', 'XPD', 'MRNA', 'CRWD', 'NVDL', 'CRDO', 'USAR', 'PDD', 'RAM',
  'TENCENT', 'GLW', 'GIGADEV', 'KSTR', 'ASTS', 'ALAB', 'AMAT', 'HK1810', 'SHAZ', 'STXX', 'APP', 'CSOPSAMSUNG2L', 'LLY',
  'FLNC', 'ASML', 'SMCI', 'WMT', 'BNC', 'EWT', 'GME', 'NFLX', 'XOM', 'SOXX', 'LRCX', 'ONDS', 'COST', 'HK0992', 'BBX',
  'CYPH', 'BOT', 'IBM', 'NOW', 'IONQ', 'ZM', 'KO', 'HIMS', 'EWJ', 'SMH', 'IWM', 'NOK', 'USDBRL', 'DJT', 'TSLL',
  'KUAISHOU', 'HYUNDAI', 'BRKB', 'NET', 'QNTX', 'PENG', 'HPE', 'MDB', 'CRM', 'GEV', 'MARA', 'UNH', 'MCD', 'BSP',
  'SAMSUNGEM', 'AMC', 'BWET', 'TER', 'ACN', 'MEITUAN', 'ADBE', 'KLAC', 'IGV', 'SONY', 'TXN', 'CIEN', 'DKNG', 'CAT',
  'CRML', 'HUT', 'NKE', 'DIS', 'AGPU', 'TEM', 'SNOW', 'BYD', 'IBKR', 'JPM', 'RIVN', 'SOFI', 'GTLB', 'EWZ', 'TWST',
  'POPMART', 'APLD', 'WEN', 'VRT', 'GPRO', 'SMR', 'GS', 'GDX', 'NVO', 'EIDO', 'LGELECTRONICS', 'PAYP', 'RDDT', 'V',
  'SHOP', 'BX', 'LYTE', 'STM', 'FWDI', 'TEAM', 'ETN', 'XBI', 'ZS', 'TMF', 'URNM', 'FLEX', 'AKAM', 'USDEX', 'UBER',
  'FRHC', 'CVNA', 'MRK', 'ZCSH', 'CSCO', 'TZA', 'EWZS', 'MOONSHOT', 'DDOG', 'ARTY', 'RUM', 'ANET', 'PFE', 'RDW', 'XLE',
  'SECZ', 'BAC', 'HANMI', 'HD', 'IBIT', 'SNPS', 'OKLO', 'VKTX', 'VST', 'MP', 'CCJ', 'MELI', 'TBT', 'PATH', 'EBAY',
  'NAVER', 'AMGN', 'CEG', 'NU', 'ABBV', 'MDT', 'HK0625', 'EQT', 'OXY', 'PYPL', 'KODEX200', 'OURA',
])

const COMMODITIES: ReadonlySet<string> = new Set(['XAU', 'XAG', 'XPT', 'XPD', 'CL', 'BZ', 'NATGAS', 'COPPER'])

const FUNDS: ReadonlySet<string> = new Set([
  'SOXL', 'SOXS', 'SOXX', 'SMH', 'QQQ', 'TQQQ', 'SQQQ', 'SPY', 'IWM', 'TZA', 'TMF', 'TBT', 'UVXY', 'XBI', 'XLE', 'IGV',
  'ARTY', 'LYTE', 'DRAM', 'RAM', 'GDX', 'URNM', 'BWET', 'KSTR', 'EWY', 'EWT', 'EWJ', 'EWZ', 'EWZS', 'EIDO', 'KORU',
  'IBIT', 'BITO', 'ZCSH', 'SNXX', 'MUU', 'MVLL', 'INTW', 'SKUU', 'SKDD', 'MSTU', 'NVDL', 'TSLL', 'KODEX200',
  'CSOPSKHYNIX2L', 'CSOPSAMSUNG2L',
])

const CURRENCIES: ReadonlySet<string> = new Set(['USDBRL'])

export function perpsMarketClass(baseSymbol: string): PerpsMarketClass | null {
  if (CRYPTO.has(baseSymbol)) return 'crypto'
  if (TRADFI.has(baseSymbol)) return 'tradfi'
  return null
}

export function perpsUnderlying(baseSymbol: string): PerpsUnderlying | null {
  if (CRYPTO.has(baseSymbol)) return 'coin'
  if (!TRADFI.has(baseSymbol)) return null
  if (COMMODITIES.has(baseSymbol)) return 'commodity'
  if (FUNDS.has(baseSymbol)) return 'fund'
  if (CURRENCIES.has(baseSymbol)) return 'currency'
  return 'stock'
}
