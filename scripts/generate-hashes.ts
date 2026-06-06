import bcrypt from 'bcryptjs'

const vendors = [
  { email: 'admin@rifadana.com',    password: 'ADMIN-99', name: 'Admin',       role: 'admin' },
  { email: 'johntoledot@gmail.com', password: 'DANNA-1',  name: 'Juan Toledo', role: 'vendedor' },
]

for (const v of vendors) {
  const hash = bcrypt.hashSync(v.password, 10)
  console.log(`('${v.email}', '${hash}', '${v.password}', '${v.name}', '${v.role}'),`)
}
