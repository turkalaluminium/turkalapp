import fs from 'fs'
import path from 'path'

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.dwg', '.dxf'])

function parseArgs(argv) {
  const result = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      result[key] = true
      continue
    }
    result[key] = next
    i += 1
  }
  return result
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/')
}

function collectFiles(dir, root, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectFiles(full, root, out)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) continue
    out.push({
      fullPath: full,
      relativePath: toPosix(path.relative(root, full)),
    })
  }
}

async function uploadOne({ apiBase, key, file, overwrite }) {
  const contentBase64 = fs.readFileSync(file.fullPath).toString('base64')
  const res = await fetch(`${apiBase}/api/technical-drawings/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-upload-key': key,
    },
    body: JSON.stringify({
      relativePath: file.relativePath,
      contentBase64,
      overwrite,
    }),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const source = String(args.source || '').trim()
  const apiBase = String(args.api || '').trim().replace(/\/+$/, '')
  const key = String(args.key || '').trim()
  const overwrite = args.overwrite === 'true' || args.overwrite === true

  if (!source || !apiBase || !key) {
    console.error('Kullanim:')
    console.error('node upload-technical-drawings.mjs --source "C:/TEKNIK CIZIM" --api "https://your-backend.up.railway.app" --key "UPLOAD_KEY" [--overwrite true]')
    process.exit(1)
  }

  const sourceAbs = path.resolve(source)
  if (!fs.existsSync(sourceAbs) || !fs.statSync(sourceAbs).isDirectory()) {
    console.error(`Kaynak klasor bulunamadi: ${sourceAbs}`)
    process.exit(1)
  }

  const files = []
  collectFiles(sourceAbs, sourceAbs, files)
  if (!files.length) {
    console.log('Yuklenecek destekli dosya bulunamadi.')
    process.exit(0)
  }

  console.log(`Toplam ${files.length} dosya yuklenecek...`)
  let okCount = 0
  let failCount = 0

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]
    try {
      const result = await uploadOne({ apiBase, key, file, overwrite })
      if (result.ok) {
        okCount += 1
        console.log(`[${i + 1}/${files.length}] OK   ${file.relativePath}`)
      } else {
        failCount += 1
        const msg = result.json?.error || `HTTP ${result.status}`
        console.log(`[${i + 1}/${files.length}] FAIL ${file.relativePath} -> ${msg}`)
      }
    } catch (err) {
      failCount += 1
      console.log(`[${i + 1}/${files.length}] FAIL ${file.relativePath} -> ${err.message}`)
    }
  }

  console.log(`Bitti. Basarili: ${okCount}, Hatali: ${failCount}`)
  process.exit(failCount ? 2 : 0)
}

main()
