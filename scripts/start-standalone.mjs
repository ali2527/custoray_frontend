/**
 * PM2 entry: copy static assets into the standalone folder, then start Next.
 * `output: "standalone"` does not include `public` or `.next/static`.
 * PORT comes from the environment (cPanel). It is not hardcoded here.
 */
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const standaloneDir = path.join(root, ".next", "standalone")
const serverFile = path.join(standaloneDir, "server.js")

function copyInto(from, to) {
  if (!fs.existsSync(from)) {
    console.error(`start: missing ${path.relative(root, from)}`)
    process.exit(1)
  }
  fs.cpSync(from, to, { recursive: true, force: true })
}

if (!fs.existsSync(serverFile)) {
  console.error("start: .next/standalone/server.js not found. Run npm run build first.")
  process.exit(1)
}

copyInto(path.join(root, "public"), path.join(standaloneDir, "public"))
copyInto(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"))

const child = spawn(process.execPath, [serverFile], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: process.env,
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
