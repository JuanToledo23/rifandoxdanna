import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './_load-vendors'
loadEnvLocal()
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const rows = Array.from({ length: 50 }, (_, i) => ({ numero: 301 + i, status: 'disponible' as const }))
  console.log('→ Insertando boletos 301-350…')
  const { error } = await s.from('boletos').insert(rows)
  if (error) {
    console.error('ERROR:', error.message)
    console.error('Code:', error.code)
    console.error('Details:', error.details)
    process.exit(1)
  }
  const { count } = await s.from('boletos').select('numero', { count: 'exact', head: true })
  console.log(`✓ Insertados. Total ahora: ${count}`)
}
main().catch(e => { console.error(e); process.exit(1) })
