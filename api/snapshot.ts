import { buildSnapshot } from '../server/buildSnapshot.js'

// GET /api/snapshot: the dashboard's whole data document.
//
// Cached at the CDN for a minute and served stale while it revalidates, so
// the upstream APIs see about one fan-out a minute however many people have
// the dashboard open.
export async function GET(): Promise<Response> {
  try {
    const snapshot = await buildSnapshot()
    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (err) {
    console.error('snapshot: build failed', err)
    return Response.json(
      { error: 'The analytics service did not answer. Try again shortly.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
