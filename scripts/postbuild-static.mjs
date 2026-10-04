/**
 * After `next build` (static export):
 * 1) Verify every /_next/static asset referenced by HTML exists in out/
 * 2) Write cache headers for hashed assets
 *
 * Deploy rule: upload the ENTIRE out/ folder in one sync.
 * Do not upload index.html without the matching out/_next folder.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "out")

function walkHtmlFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkHtmlFiles(full, acc)
    else if (entry.isFile() && entry.name.endsWith(".html")) acc.push(full)
  }
  return acc
}

function collectAssetRefs(html) {
  const refs = new Set()
  const re = /(?:href|src)=["'](\/_next\/static\/[^"']+)["']/g
  let match
  while ((match = re.exec(html))) refs.add(match[1])
  return refs
}

function main() {
  if (!fs.existsSync(outDir)) {
    console.error("postbuild-static: out/ not found. Run next build first.")
    process.exit(1)
  }

  const htmlFiles = walkHtmlFiles(outDir)
  const missing = []
  let checked = 0

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8")
    for (const ref of collectAssetRefs(html)) {
      checked += 1
      const abs = path.join(outDir, ref.replace(/^\//, "").replace(/\//g, path.sep))
      if (!fs.existsSync(abs)) {
        missing.push({ file: path.relative(outDir, file), ref })
      }
    }
  }

  if (missing.length) {
    console.error(`postbuild-static: ${missing.length} missing asset(s) referenced by HTML:`)
    for (const item of missing.slice(0, 40)) {
      console.error(`  ${item.file} -> ${item.ref}`)
    }
    process.exit(1)
  }

  const staticDir = path.join(outDir, "_next", "static")
  if (fs.existsSync(staticDir)) {
    fs.writeFileSync(
      path.join(staticDir, ".htaccess"),
      `# Hashed Next.js assets — safe to cache forever (filename changes each build).
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>
`,
      "utf8"
    )
  }

  console.log(
    `postbuild-static: ok — checked ${checked} asset refs across ${htmlFiles.length} HTML files`
  )
  console.log("Deploy: replace the WHOLE site root with out/ (including _next). Never partial-upload HTML.")
}

main()
