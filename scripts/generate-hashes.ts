import bcrypt from 'bcryptjs'

const vendors = [
  { email: 'admin@rifadana.com', password: 'ADMIN-99', name: 'Admin',  role: 'admin' },
  { email: 'ana@gmail.com',      password: 'DANA-11',  name: 'Ana',    role: 'vendedor' },
  { email: 'luis@gmail.com',     password: 'DANA-22',  name: 'Luis',   role: 'vendedor' },
  { email: 'karina@gmail.com',   password: 'DANA-33',  name: 'Karina', role: 'vendedor' },
]

for (const v of vendors) {
  const hash = bcrypt.hashSync(v.password, 10)
  console.log(`('${v.email}', '${hash}', '${v.password}', '${v.name}', '${v.role}'),`)
}
