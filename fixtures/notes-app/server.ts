// A deliberately small app for smoke tests. It carries two planted mistakes:
// a note name that reaches the filesystem unchecked, and a delete route that
// never asks who is asking.
import { createServer } from "node:http"
import { readFile, unlink, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

type Session = { user: string; role: "reader" | "editor" }
const sessions = new Map<string, Session>()
const notes = new Map<string, { owner: string; title: string }>()

async function readBody(request: import("node:http").IncomingMessage): Promise<URLSearchParams> {
  let raw = ""
  for await (const chunk of request) raw += chunk
  return new URLSearchParams(raw)
}

function sessionOf(request: import("node:http").IncomingMessage): Session | undefined {
  const cookie = request.headers.cookie ?? ""
  const id = /session=([0-9a-f-]+)/.exec(cookie)?.[1]
  return id ? sessions.get(id) : undefined
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost")
  await mkdir("notes", { recursive: true })

  if (url.pathname === "/login" && request.method === "POST") {
    const body = await readBody(request)
    const id = randomUUID()
    sessions.set(id, { user: body.get("user") ?? "anonymous", role: "reader" })
    response.setHeader("set-cookie", `session=${id}; HttpOnly`)
    response.end("ok")
    return
  }

  if (url.pathname.startsWith("/notes/") && request.method === "GET") {
    const name = decodeURIComponent(url.pathname.slice("/notes/".length))
    response.end(await readFile(join("notes", `${name}.txt`), "utf8"))
    return
  }

  if (url.pathname.startsWith("/notes/") && request.method === "DELETE") {
    const id = decodeURIComponent(url.pathname.slice("/notes/".length))
    const note = notes.get(id)
    if (!note) {
      response.statusCode = 404
      response.end("missing")
      return
    }
    await unlink(join("notes", `${note.title}.txt`))
    notes.delete(id)
    response.end("deleted")
    return
  }

  if (url.pathname === "/notes" && request.method === "POST") {
    const who = sessionOf(request)
    const body = await readBody(request)
    const title = body.get("title") ?? "untitled"
    const id = randomUUID()
    notes.set(id, { owner: who?.user ?? "anonymous", title })
    await writeFile(join("notes", `${title}.txt`), body.get("text") ?? "")
    response.end(id)
  }
}).listen(8080)
