import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Serves `/api/snapshot` from the dev server, running the same handler Vercel
 * deploys from `api/snapshot.ts`, so local development reads live data. */
function snapshotApi(): Plugin {
  return {
    name: 'snapshot-api',
    configureServer(server) {
      server.middlewares.use('/api/snapshot', async (_req, res) => {
        try {
          const { GET } = await server.ssrLoadModule('/api/snapshot.ts')
          const response: Response = await GET()
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        } catch (err) {
          console.error('snapshot-api: handler failed to load or run', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'The snapshot handler failed. See the dev server log.' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), snapshotApi()],
})
