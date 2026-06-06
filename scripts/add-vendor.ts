import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

import { loadEnvLocal, loadVendors } from './_load-vendors'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)
const vendors = loadVendors()

async function main() {
  console.log(`→ Upsert de ${vendors.length} vendedores desde scripts/vendors.local.json…`)
  for (const v of vendors) {
    const row = {
      email: v.email,
      password_hash: bcrypt.hashSync(v.password, 10),
      password_plain: v.password,
      name: v.name,
      role: v.role,
      session_token: null,
    }
    const { error } = await supabase.from('vendedores').upsert(row, { onConflict: 'email' })
    if (error) {
      console.error(`  ✗ ${v.email}: ${error.message}`)
      process.exitCode = 1
    } else {
      console.log(`  ✓ ${v.email} | ${v.name} | ${v.role}`)
    }
  }

  const { data } = await supabase
    .from('vendedores')
    .select('email, name, role')
    .order('role')
  console.log(`\nTotal vendedores en DB: ${data?.length ?? 0}`)
  for (const v of data ?? []) console.log(`  · ${v.email} | ${v.name} | ${v.role}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
