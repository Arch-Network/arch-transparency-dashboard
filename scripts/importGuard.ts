import { readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'

/** A relative path named by an import, an export-from, a dynamic import or a require. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.[^'"]*)['"]/g

/** The imports in the TypeScript under `dirs` that reach into `banned`, each
 * as "file imports path". All three are relative to `root`. The compiler
 * keeps `scripts/` out of the page; this keeps it out of the server function. */
export function importsInto(root: string, dirs: string[], banned: string): string[] {
  const wall = resolve(root, banned) + sep
  return dirs.flatMap((dir) =>
    readdirSync(resolve(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((name) => /\.[cm]?tsx?$/.test(name))
      .flatMap((name) => {
        const file = resolve(root, dir, name)
        return [...readFileSync(file, 'utf8').matchAll(SPECIFIER)]
          .filter(([, path]) => (resolve(dirname(file), path) + sep).startsWith(wall))
          .map(([, path]) => `${relative(root, file)} imports ${path}`)
      }),
  )
}
