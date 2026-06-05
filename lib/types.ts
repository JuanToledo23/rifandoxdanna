export type BoletoStatus = 'disponible' | 'comprado'

export interface Boleto {
  numero: number
  status: BoletoStatus
  comprador_nombre: string | null
  comprador_tel: string | null
  vendedor_email: string | null
  sold_at: string | null
}

export type Role = 'vendedor' | 'admin'

export interface Vendedor {
  id: string
  email: string
  name: string
  role: Role
  password_plain?: string
}

export interface Session {
  token: string
  email: string
  name: string
  role: Role
}
