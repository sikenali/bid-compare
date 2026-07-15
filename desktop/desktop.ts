import { Webview } from "@webview/webview"

const PORT = 51730

const distDir = (() => {
  const binDir = import.meta.dirname
  if (binDir) {
    const resolved = new URL("../dist", `file://${binDir}/`).pathname
    try { Deno.statSync(resolved); return resolved } catch {}
  }
  const cwdDist = new URL("./dist", `file://${Deno.cwd()}/`).pathname
  try { Deno.statSync(cwdDist); return cwdDist } catch {
    console.error("Cannot find dist/ directory. Build the app first: npm run build")
    Deno.exit(1)
  }
})()

const serverProc = new Deno.Command(Deno.execPath(), {
  args: [
    "eval",
    `
    import { serveDir } from "jsr:@std/http@^1";
    const ac = new AbortController();
    Deno.serve({ port: ${PORT}, signal: ac.signal, onListen() { console.log("READY"); } },
      (req) => serveDir(req, { fsRoot: ${JSON.stringify(distDir)}, urlRoot: "" })
    );
  `,
  ],
  stdout: "piped",
  stderr: "inherit",
  env: { GTK_A11Y: "none" },
}).spawn()

await new Promise<void>((resolve, reject) => {
  const reader = serverProc.stdout.getReader()
  const decoder = new TextDecoder()
  ;(async () => {
    const timer = setTimeout(() => reject(new Error("Server start timeout")), 10000)
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (decoder.decode(value).includes("READY")) {
        clearTimeout(timer)
        resolve()
      }
    }
  })()
})

const webview = new Webview(false)
webview.title = "文比猩"
webview.navigate(`http://localhost:${PORT}/`)

try {
  webview.run()
} finally {
  serverProc.kill()
}
