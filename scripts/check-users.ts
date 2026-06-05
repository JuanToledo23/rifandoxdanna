import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
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
}

loadEnvLocal()

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data, error } = await s
    .from('vendedores')
    .select('email, name, role, password_plain, session_token')
    .order('role')
  if (error) {
    console.error('ERROR:', error.message)
    process.exit(1)
  }
  console.log('Vendedores en DB:')
  for (const v of data) {
    const token = v.session_token ? v.session_token.slice(0, 8) + '…' : '(null)'
    console.log(`  · ${v.email} | ${v.name} | ${v.role} | pass: ${v.password_plain ?? '(null)'} | token: ${token}`)
  }
  console.log('Total:', data.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
