import { readFileSync } from 'node:fs'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local missing is fine if vars are already in environment
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const vendors = [
  { email: 'admin@rifadana.com',    password: 'ADMIN-99', name: 'Admin',       role: 'admin' as const },
  { email: 'johntoledot@gmail.com', password: 'DANNA-1',  name: 'Juan Toledo', role: 'vendedor' as const },
]

async function main() {
  console.log('→ 1/3 Reseteando los 300 boletos a "disponible"…')
  const { error: resetErr } = await supabase
    .from('boletos')
    .update({
      status: 'disponible',
      comprador_nombre: null,
      comprador_tel: null,
      vendedor_email: null,
      sold_at: null,
    })
    .neq('numero', 0)
  if (resetErr) throw resetErr
  console.log('  ✓ boletos reseteados')

  console.log('→ 2/3 Borrando vendedores existentes…')
  const { error: delErr } = await supabase
    .from('vendedores')
    .delete()
    .neq('email', '__noop__')
  if (delErr) throw delErr
  console.log('  ✓ vendedores borrados')

  console.log('→ 3/3 Insertando vendedores nuevos…')
  const rows = vendors.map((v) => ({
    email: v.email,
    password_hash: bcrypt.hashSync(v.password, 10),
    password_plain: v.password,
    name: v.name,
    role: v.role,
  }))
  const { error: insErr } = await supabase.from('vendedores').insert(rows)
  if (insErr) throw insErr
  console.log(`  ✓ ${rows.length} vendedores insertados:`)
  for (const v of vendors) console.log(`    · ${v.email} (${v.role}) — ${v.password}`)

  const { count: boletosCount } = await supabase
    .from('boletos')
    .select('numero', { count: 'exact', head: true })
  console.log(`\nEstado final: ${boletosCount} boletos · ${rows.length} vendedores ✓`)
}

main().catch((err) => {
  console.error('\nERROR:', err.message ?? err)
  process.exit(1)
})
