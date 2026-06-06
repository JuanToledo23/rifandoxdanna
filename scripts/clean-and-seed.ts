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

  console.log(`→ 3/3 Insertando ${vendors.length} vendedores desde scripts/vendors.local.json…`)
  const rows = vendors.map((v) => ({
    email: v.email,
    password_hash: bcrypt.hashSync(v.password, 10),
    password_plain: v.password,
    name: v.name,
    role: v.role,
  }))
  const { error: insErr } = await supabase.from('vendedores').insert(rows)
  if (insErr) throw insErr
  console.log(`  ✓ ${rows.length} vendedores insertados`)
  for (const v of vendors) console.log(`    · ${v.email} (${v.role})`)

  const { count: boletosCount } = await supabase
    .from('boletos')
    .select('numero', { count: 'exact', head: true })
  console.log(`\nEstado final: ${boletosCount} boletos · ${rows.length} vendedores ✓`)
}

main().catch((err) => {
  console.error('\nERROR:', err.message ?? err)
  process.exit(1)
})
