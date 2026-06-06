import bcrypt from 'bcryptjs'

import { loadVendors } from './_load-vendors'

// Genera líneas SQL (`(email, hash, plain, name, role)`) listas para pegar en
// el SQL editor de Supabase. Lee las credenciales desde scripts/vendors.local.json.

const vendors = loadVendors()

for (const v of vendors) {
  const hash = bcrypt.hashSync(v.password, 10)
  console.log(`('${v.email}', '${hash}', '${v.password}', '${v.name}', '${v.role}'),`)
}
