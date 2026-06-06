import { existsSync, readFileSync } from 'node:fs'

export interface Vendor {
  email: string
  password: string
  name: string
  role: 'admin' | 'vendedor'
}

const PATH = 'scripts/vendors.local.json'

export function loadVendors(): Vendor[] {
  if (!existsSync(PATH)) {
    console.error(
      `Falta ${PATH}.\n` +
      `Copia scripts/vendors.example.json a scripts/vendors.local.json y rellena las credenciales.`,
    )
    process.exit(1)
  }
  const raw = JSON.parse(readFileSync(PATH, 'utf8')) as { vendors?: Vendor[] }
  if (!Array.isArray(raw.vendors) || raw.vendors.length === 0) {
    console.error(`${PATH} no contiene un array "vendors" válido.`)
    process.exit(1)
  }
  return raw.vendors
}

export function loadEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const key = t.slice(0, i).trim()
      const value = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local missing is fine if vars are already in environment
  }
}
