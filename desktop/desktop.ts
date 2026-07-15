import { Webview } from "@webview/webview"
import { serveDir } from "jsr:@std/http@^1"

const PORT = 51730

const ac = new AbortController()

const distDir = (() => {
  const binDir = import.meta.dirname
  if (binDir) {
    const resolved = new URL("../dist", `file://${binDir}/`).pathname
    try {
      Deno.statSync(resolved)
      return resolved
    } catch {
      // fall through
    }
  }
  const cwdDist = new URL("./dist", `file://${Deno.cwd()}/`).pathname
  try {
    Deno.statSync(cwdDist)
    return cwdDist
  } catch {
    console.error("Cannot find dist/ directory. Build the app first: npm run build")
    Deno.exit(1)
  }
})()

Deno.serve({ port: PORT, signal: ac.signal, onListen: () => {} }, (req) => {
  return serveDir(req, { fsRoot: distDir, urlRoot: "" })
})

const webview = new Webview(false)
webview.title = "文比猩"
webview.navigate(`http://localhost:${PORT}`)

webview.run()
ac.abort()
