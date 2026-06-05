# SPEC-000 — rifandoxdana
**Sistema de boletos para rifa solidaria · Rifa por Dana**

> Spec cerrado. Todo elemento mencionado está clasificado como in-scope, diferido, o descartado.  
> Versión: 1.0 · Fecha: 2026-06-02

---

## 0. Contexto

Rifa solidaria para juntar $20,000–$25,000 MXN para apoyar a Dana, una niña que tuvo un accidente y necesita equipo de rehabilitación. Se venderán 300 boletos a $100 c/u. Varios vendedores operan en paralelo, cada uno desde su celular. Se necesita un sistema simple que evite vender el mismo número dos veces y que permita monitoreo en tiempo real.

**Flujo validado en prototipo HTML:** login con correo + contraseña → grid de 300 números → toca disponible → registra comprador → boleto pasa a verde en tiempo real para todos los vendedores.

---

## 1. Definition of Success

El spec está terminado cuando se cumplan **todos** los siguientes criterios verificables:

- [ ] Vendedor entra con correo + contraseña y ve el grid de 300 boletos en menos de 2 segundos
- [ ] Al tocar un número disponible y confirmar los datos, el boleto pasa a "comprado" en el grid de todos los vendedores abiertos sin refrescar la página (realtime ≤ 3s)
- [ ] Si dos vendedores intentan vender el mismo número simultáneamente, solo uno tiene éxito; el otro ve un error claro
- [ ] El admin ve el panel con total recaudado, lista de vendedores con contraseñas, y lista de boletos vendidos
- [ ] La vista pública muestra el grid con tooltip de nombre del comprador (desktop) o toast al tocar (mobile), sin necesidad de login
- [ ] El proyecto hace deploy en Vercel en un solo comando y funciona en producción

---

## 2. ICP

**Usuario principal:** Vendedor de la rifa — persona de confianza que vende ~20–50 boletos desde su celular (iPhone o Android). No es técnico. Opera en WhatsApp mientras vende.

**Usuario secundario:** Admin (la organizadora principal) — monitorea el avance, gestiona vendedores, confirma el total recaudado.

**Usuario terciario:** Público general — consulta qué números están disponibles sin hacer login.

**Qué NO es este sistema:**
- No es una plataforma de pagos — los pagos se hacen fuera (transferencia, efectivo); el sistema solo registra que se vendió
- No es un sistema multi-rifa — está hardcodeado para una rifa, 300 boletos, $100 c/u
- No tiene autenticación de Supabase Auth — usa auth custom por simplicidad
- No tiene recuperación de contraseña — las contraseñas las gestiona el admin manualmente

---

## 3. Stack (decisiones baseline)

Stack decidido antes del spec basado en experiencia previa. No se evalúan alternativas.

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js App Router | 15 |
| Estilos | Tailwind CSS v4 | latest |
| Componentes | shadcn/ui | latest |
| Base de datos | Supabase (PostgreSQL) | — |
| Realtime | Supabase Realtime | — |
| Deploy | Vercel | — |
| Runtime | Node.js | 20+ |

**Dependencias clave:**
```
@supabase/supabase-js
bcryptjs
@types/bcryptjs
```

**No se usa:**
- Drizzle ORM (una tabla, SQL directo)
- Supabase Auth (auth custom)
- Hono / tRPC (API routes de Next.js bastan)
- Zustand / Redux (useState + SWR bastan)

---

## 4. Configuración inicial

### 4.1 Scaffold del proyecto

```bash
npx create-next-app@latest rifandoxdana \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd rifandoxdana
npx shadcn@latest init
```

Componentes shadcn a instalar:
```bash
npx shadcn@latest add button input label card badge separator dialog
```

### 4.2 Variables de entorno

Crear `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://djrwawddtmluzknzjxmk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8N1Jcs-mBbLWC1FjS8QALg_yTPA5jmt
SUPABASE_SERVICE_ROLE_KEY=<obtener de Supabase Dashboard → Settings → API → service_role>
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` NUNCA debe tener el prefijo `NEXT_PUBLIC_`. Solo se usa en API routes server-side.

### 4.3 MCP de Supabase para Claude Code

Antes de empezar a implementar, ejecutar en la raíz del proyecto:
```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=djrwawddtmluzknzjxmk"
```

Esto permite que Claude Code corra las migraciones directamente desde el editor.

### 4.4 Cliente Supabase

Crear `lib/supabase/client.ts` (cliente browser, anon key):
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)
```

Crear `lib/supabase/server.ts` (cliente server, service role):
```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

---

## 5. Base de datos — Migraciones SQL

Correr vía MCP de Supabase en orden.

### Migración 001 — Tabla vendedores

```sql
-- 001_create_vendedores.sql
CREATE TABLE vendedores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('vendedor', 'admin')),
  session_token TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: deshabilitado — acceso solo via service role desde API routes
ALTER TABLE vendedores DISABLE ROW LEVEL SECURITY;
```

### Migración 002 — Tabla boletos

```sql
-- 002_create_boletos.sql
CREATE TABLE boletos (
  numero        INTEGER PRIMARY KEY CHECK (numero BETWEEN 1 AND 300),
  status        TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'comprado')),
  comprador_nombre TEXT,
  comprador_tel    TEXT,
  vendedor_email   TEXT REFERENCES vendedores(email),
  sold_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Lectura pública (para vista pública y vendors)
ALTER TABLE boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boletos_public_read"
  ON boletos FOR SELECT
  USING (true);

-- Escritura solo desde server (service role bypasses RLS)
-- No se crea policy de write para anon/public
```

### Migración 003 — Seed de 300 boletos

```sql
-- 003_seed_boletos.sql
INSERT INTO boletos (numero, status)
SELECT generate_series(1, 300), 'disponible'
ON CONFLICT (numero) DO NOTHING;
```

### Migración 004 — Seed de vendedores iniciales

```sql
-- 004_seed_vendedores.sql
-- Contraseñas generadas con bcrypt rounds=10
-- IMPORTANTE: Reemplazar los hashes con los generados por el script de seed

-- Para generar: node -e "const b=require('bcryptjs'); console.log(b.hashSync('DANA-11',10))"
INSERT INTO vendedores (email, password_hash, name, role) VALUES
  ('admin@rifadana.com', '<hash de ADMIN-99>', 'Admin', 'admin'),
  ('ana@gmail.com',      '<hash de DANA-11>',  'Ana',   'vendedor'),
  ('luis@gmail.com',     '<hash de DANA-22>',  'Luis',  'vendedor'),
  ('karina@gmail.com',   '<hash de DANA-33>',  'Karina','vendedor');
```

> Claude Code debe crear un script `scripts/generate-hashes.ts` que genere los hashes reales antes de correr esta migración.

---

## 6. Autenticación custom

### Modelo de sesión

No se usa Supabase Auth. La sesión es un token aleatorio (`crypto.randomUUID()`) almacenado en:
- DB: columna `vendedores.session_token`
- Client: `localStorage.getItem('session')` como JSON:
  ```json
  { "token": "uuid", "email": "ana@gmail.com", "name": "Ana", "role": "vendedor" }
  ```

### Flujo de login

1. Cliente `POST /api/auth/login` con `{ email, password }`
2. Server busca vendedor por email con service role client
3. `bcrypt.compare(password, vendedor.password_hash)`
4. Si válido: genera nuevo `token = crypto.randomUUID()`, guarda en `vendedores.session_token`, retorna `{ token, email, name, role }`
5. Si inválido: retorna `401`
6. Cliente guarda en localStorage

### Middleware de validación

Crear `lib/auth/validate-session.ts`:
```ts
// Recibe el header Authorization: Bearer <token>
// Busca en vendedores por session_token
// Retorna el vendedor o null
```

Todas las API routes de escritura llaman a `validateSession()` antes de procesar.

### Flujo de logout

DELETE `localStorage.session` → redirect a `/`

---

## 7. API Routes

Todas en `app/api/`.

### POST /api/auth/login
- Body: `{ email: string, password: string }`
- Validación: bcrypt compare
- Respuesta 200: `{ token, email, name, role }`
- Respuesta 401: `{ error: "Credenciales incorrectas" }`

### POST /api/auth/logout
- Header: `Authorization: Bearer <token>`
- Limpia `session_token` en DB
- Respuesta 200: `{ ok: true }`

### POST /api/boletos/comprar
- Header: `Authorization: Bearer <token>`
- Body: `{ numero: number, comprador_nombre: string, comprador_tel: string }`
- Validación de sesión obligatoria
- Query atómica para prevenir doble-venta:
  ```sql
  UPDATE boletos 
  SET status = 'comprado',
      comprador_nombre = $1,
      comprador_tel = $2,
      vendedor_email = $3,
      sold_at = NOW()
  WHERE numero = $4 AND status = 'disponible'
  RETURNING *
  ```
- Si `rowCount === 0`: boleto ya fue vendido → 409 `{ error: "Este número ya fue vendido" }`
- Si éxito: 200 `{ boleto }`

### GET /api/boletos
- Sin auth requerida
- Retorna todos los 300 boletos con sus datos
- Usar supabase anon client (subject a RLS policy de lectura pública)

---

## 8. Páginas y rutas

```
app/
├── page.tsx                    → Redirect: si hay sesión → /vender, si no → /login
├── login/
│   └── page.tsx                → Vista login (email + password)
├── publica/
│   └── page.tsx                → Vista pública (sin auth)
├── vender/
│   └── page.tsx                → Vista vendedor (requiere sesión)
└── admin/
    └── page.tsx                → Vista admin (requiere sesión + role=admin)
```

### Protección de rutas

No usar Next.js middleware (overengineering). Cada página protegida hace:
```ts
// Al montar el componente
const session = getSession() // lee localStorage
if (!session) redirect('/login')
if (page === 'admin' && session.role !== 'admin') redirect('/vender')
```

---

## 9. Especificación de páginas

### 9.1 /login

**Layout:** centrado vertical y horizontal, max-width 400px, padding 24px  
**Elementos:**
- Logo: emoji 🧡 + "Rifemos por Dana" (text-2xl font-bold) + "Sistema de boletos" (text-sm text-muted-foreground)
- Input: correo electrónico (type="email", autocomplete="email")
- Input: contraseña (type="password", autocomplete="current-password")
- Botón primario: "Entrar →" (full width)
- Error inline: badge rojo debajo del botón cuando credenciales inválidas
- Divisor con link: "Ver boletos disponibles →" → navega a `/publica` sin login

**Comportamiento:**
- Enter en campo contraseña dispara submit
- Loading state en botón mientras hace fetch
- Al login exitoso: guarda sesión en localStorage → redirect a `/vender` o `/admin` según role

---

### 9.2 /publica

**Layout:** max-width 480px, centrado, padding 16px  
**Header:** "Rifemos por Dana 🧡" + subtítulo "Boletos · $100 c/u" + botón "Vendedores →" (va a `/login`)

**Stats bar:**
- `{comprados}` vendidos · `{disponibles}` disponibles
- Progress bar (verde, de 0 a 300)
- Porcentaje completado

**Leyenda:** dot gris "Disponible" · dot verde "Comprado"

**Grid 300 números:**
- 10 columnas, gap-1
- `disponible`: bg-gray-100 text-gray-400 border border-gray-200
- `comprado`: bg-green-50 text-green-700 border border-green-200 font-semibold
- Cursor: `cursor-default` en ambos (no se puede comprar desde la vista pública)

**Tooltip desktop:**
- Al hacer hover sobre cualquier número: tooltip con:
  - Si `comprado`: nombre del comprador (ej. "Sofía R.")
  - Si `disponible`: "Disponible"
- Implementar con estado JS + mousemove (NO CSS ::after — necesita datos dinámicos)

**Toast mobile:**
- `touchstart` en cualquier número → bottom toast con el mismo contenido del tooltip
- Toast desaparece en 2000ms

**Realtime:** suscripción a cambios en `boletos` → actualiza el grid sin reload

---

### 9.3 /vender

**Requiere:** sesión válida (cualquier role)

**Header:**
- Izquierda: "Vendedor" (label) / `{name}` (title)
- Derecha: chip con email del vendor + botón "Salir"

**Stats (2 cards):**
- Vendidos (verde) · Disponibles (gris)

**Leyenda:** igual que vista pública

**Grid 300 números:**
- `disponible`: igual que pública + `cursor-pointer` + `hover:bg-orange-50 hover:border-orange-300`
- `comprado`: igual que pública + `cursor-pointer` (para ver info)
- Número seleccionado disponible: `bg-blue-50 border-blue-400 text-blue-700 scale-90`
- Número seleccionado comprado: `bg-green-100 border-green-600 text-green-800 scale-90`

**Panel de compra** (aparece inline debajo del grid al seleccionar un `disponible`):
- Badge con número seleccionado (prominent, blue)
- Input: "Nombre completo" (requerido, mínimo 2 chars)
- Input: "Teléfono" (type="tel", requerido, mínimo 6 chars)
- Botones: "Cancelar" (ghost) + "Confirmar venta" (primary)
- Loading state en botón mientras hace fetch
- Si error 409: mensaje "Este número ya fue vendido, elige otro"
- Si éxito: panel desaparece + success bar verde en header + grid actualiza

**Panel de info** (aparece al seleccionar un `comprado`):
- Badge con número (verde)
- "Comprador: {nombre}"
- "Teléfono: {tel}"
- "Vendido por: {vendedor_email}"
- Botón "Cerrar"

**Realtime:** suscripción a INSERT/UPDATE en `boletos` → actualiza el grid en tiempo real

**Success bar:** aparece durante 3 segundos después de una venta exitosa:
- "✓ Boleto #012 vendido — Sofía R."
- Luego desaparece con fade

---

### 9.4 /admin

**Requiere:** sesión con `role === 'admin'`

**Header:** "Panel" (label) / "Rifa por Dana 🧡" + botón "Salir"

**Card de progreso:**
- `${ total }` recaudado (total = boletos_comprados × 100)
- `{ pct }%` de $23,000
- Progress bar verde animada

**Stats (2 cards):** Vendidos · Disponibles

**Sección "Vendedores y contraseñas":**
- Lista de todos los vendors (no admin)
- Cada row: nombre + email + contraseña en `<code>` badge
- Las contraseñas se guardan en texto plano en una columna adicional `password_plain` SOLO para que el admin pueda verlas y compartirlas por WhatsApp

> ⚠️ Decisión de seguridad aceptada: para una rifa familiar de corta duración, guardar la contraseña en texto plano en columna separada está dentro del riesgo aceptable. El hash sigue siendo el mecanismo de auth.

**Sección "Boletos vendidos":**
- Lista ordenada por número (ASC)
- Cada row: `#NNN` badge verde + nombre + teléfono + nombre del vendedor (sin email)
- Sin paginación — máximo 300 registros

**Sin realtime en admin** — la vista se recarga al navegar. Suficiente para el caso de uso.

---

## 10. Realtime

Usar Supabase Realtime en `/vender` y `/publica`.

```ts
// En el componente, después de cargar boletos iniciales
const channel = supabase
  .channel('boletos-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'boletos' },
    (payload) => {
      // Actualizar el boleto específico en el estado local
      // payload.new contiene el boleto actualizado
      updateBoleto(payload.new)
    }
  )
  .subscribe()

// Cleanup al desmontar
return () => { supabase.removeChannel(channel) }
```

**Habilitación en Supabase:** correr vía MCP:
```sql
ALTER TABLE boletos REPLICA IDENTITY FULL;
```
Y en Supabase Dashboard → Database → Replication → habilitar `boletos` para INSERT y UPDATE.

---

## 11. Diseño visual

### Paleta de colores (Tailwind)

| Estado | Background | Border | Text |
|---|---|---|---|
| Disponible | `bg-gray-100` | `border-gray-200` | `text-gray-400` |
| Comprado | `bg-green-50` | `border-green-200` | `text-green-700` |
| Seleccionado (disponible) | `bg-blue-50` | `border-blue-400` | `text-blue-700` |
| Seleccionado (comprado) | `bg-green-100` | `border-green-600` | `text-green-800` |
| Hover disponible | `hover:bg-orange-50` | `hover:border-orange-300` | `hover:text-orange-600` |

### Brand accent: `#E8734A` (coral/naranja)
Usar en: botón primario principal, progress bar, logo area.

Añadir al `tailwind.config.ts`:
```ts
colors: {
  brand: '#E8734A',
}
```

### Grid de boletos

```tsx
// Celda del grid
<div
  className={cn(
    "aspect-square rounded-[4px] text-[10px] flex items-center justify-center",
    "border transition-all duration-100 select-none",
    statusClasses[boleto.status],
    boleto.status === 'disponible' && "cursor-pointer active:scale-90",
    selectedId === boleto.numero && selectedClasses[boleto.status]
  )}
>
  {boleto.numero}
</div>

// Container del grid
<div className="grid grid-cols-10 gap-[3px] px-4">
```

### Tipografía
- Font: Inter (Google Fonts o next/font)
- Heading del login: `text-2xl font-bold`
- Stats: `text-2xl font-semibold`
- Número en badge grande: `font-serif text-xl font-bold`

### Responsividad
- Mobile-first: todo funciona a 375px de ancho
- El grid a 375px → cada celda ~33px (10 cols × 33px + gaps ≈ 357px ✓)
- Max-width de frame: `max-w-[480px] mx-auto`
- Padding horizontal: `px-4`

---

## 12. Estructura de archivos

```
rifandoxdana/
├── app/
│   ├── page.tsx                     # redirect logic
│   ├── login/page.tsx
│   ├── publica/page.tsx
│   ├── vender/page.tsx
│   ├── admin/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   └── boletos/
│   │       └── comprar/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── BoletosGrid.tsx              # grid 10 cols, maneja click y estados
│   ├── PanelCompra.tsx              # form de venta
│   ├── PanelInfo.tsx                # info de boleto comprado
│   ├── StatsCards.tsx               # las 2 stat cards
│   ├── ProgressCard.tsx             # progress bar + total
│   └── Tooltip.tsx                  # tooltip flotante para vista pública
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── auth/
│   │   ├── validate-session.ts
│   │   ├── get-session.ts           # lee localStorage
│   │   └── set-session.ts           # escribe localStorage
│   └── types.ts                     # Boleto, Vendedor, Session types
├── scripts/
│   └── generate-hashes.ts           # genera bcrypt hashes para seed
├── supabase/
│   └── migrations/
│       ├── 001_create_vendedores.sql
│       ├── 002_create_boletos.sql
│       ├── 003_seed_boletos.sql
│       └── 004_seed_vendedores.sql
├── .env.local
├── .env.example
└── package.json
```

---

## 13. Types

```ts
// lib/types.ts

export type BoletoStatus = 'disponible' | 'comprado'

export interface Boleto {
  numero: number
  status: BoletoStatus
  comprador_nombre: string | null
  comprador_tel: string | null
  vendedor_email: string | null
  sold_at: string | null
}

export interface Vendedor {
  id: string
  email: string
  name: string
  role: 'vendedor' | 'admin'
  password_plain?: string  // solo visible para admin
}

export interface Session {
  token: string
  email: string
  name: string
  role: 'vendedor' | 'admin'
}
```

---

## 14. Script de generación de hashes

```ts
// scripts/generate-hashes.ts
// Ejecutar: npx tsx scripts/generate-hashes.ts

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
```

Salida esperada: líneas SQL listas para pegar en `004_seed_vendedores.sql`.

---

## 15. Orden de implementación para Claude Code

Ejecutar en este orden exacto. No saltar pasos.

```
PASO 1 — Setup
  [ ] Scaffold Next.js + Tailwind + shadcn (sección 4.1)
  [ ] Crear .env.local con las 3 variables (sección 4.2)
  [ ] Agregar MCP de Supabase (sección 4.3)
  [ ] Crear lib/supabase/client.ts y server.ts (sección 4.4)

PASO 2 — Base de datos
  [ ] Correr migración 001 (vendedores)
  [ ] Correr migración 002 (boletos + RLS)
  [ ] Correr migración 003 (seed 300 boletos)
  [ ] Crear y ejecutar scripts/generate-hashes.ts
  [ ] Correr migración 004 con hashes reales
  [ ] Habilitar REPLICA IDENTITY FULL en boletos (para realtime)

PASO 3 — Auth
  [ ] lib/types.ts
  [ ] lib/auth/get-session.ts + set-session.ts + validate-session.ts
  [ ] POST /api/auth/login
  [ ] POST /api/auth/logout
  [ ] /login page completa y funcional

PASO 4 — Core: vista pública
  [ ] GET /api/boletos (o lectura directa con anon client)
  [ ] components/BoletosGrid.tsx (sin interacción de compra)
  [ ] /publica page con realtime
  [ ] Tooltip desktop + toast mobile

PASO 5 — Core: vista vendedor
  [ ] POST /api/boletos/comprar
  [ ] components/PanelCompra.tsx
  [ ] components/PanelInfo.tsx
  [ ] /vender page con realtime completo
  [ ] Validar caso de doble-venta (probar con dos tabs)

PASO 6 — Admin
  [ ] /admin page
  [ ] components/ProgressCard.tsx
  [ ] components/StatsCards.tsx
  [ ] Lista de vendedores con contraseñas
  [ ] Lista de boletos vendidos

PASO 7 — Polish
  [ ] app/page.tsx con redirect logic según sesión
  [ ] Protección de rutas en /vender y /admin
  [ ] Loading states en todos los botones
  [ ] Error states con mensajes claros
  [ ] Verificar responsividad en 375px

PASO 8 — Deploy
  [ ] Crear repo en GitHub
  [ ] Conectar a Vercel
  [ ] Agregar variables de entorno en Vercel Dashboard
  [ ] Deploy y smoke test en producción
```

---

## 16. Fuera de alcance (diferido / descartado)

| Feature | Clasificación | Razón |
|---|---|---|
| Recuperación de contraseña | Diferido | No crítico para el timeframe |
| Múltiples rifas | Descartado | Caso de uso único |
| Pago en línea integrado | Descartado | Pagos fuera del sistema |
| Notificaciones por WhatsApp | Diferido | Complejidad desproporcionada |
| Export CSV de boletos | Diferido | El admin ve la lista en pantalla |
| Dashboard de ventas por vendedor | Diferido | No requerido para la rifa |
| Eliminar / revertir una venta | Diferido | Admin puede hacerlo directo en Supabase |
| Animación de sorteo | Diferido | Bonito pero no necesario |
| Dark mode | Descartado | Fuera de alcance para este proyecto |
| PWA / instalable | Diferido | Suficiente con mobile web |

---

## 17. Checklist de cierre del spec

- [x] Cada feature tiene comportamiento descrito con lenguaje definitivo (no "intentará", sino "enviará", "bloqueará", "retornará")
- [x] El caso de doble-venta está cubierto con un mecanismo concreto (UPDATE WHERE status = 'disponible' + rowCount check)
- [x] Las variables de entorno están documentadas con su scope correcto (NEXT_PUBLIC vs server-only)
- [x] El orden de implementación está explícito paso a paso
- [x] Todo lo fuera de alcance está clasificado como diferido o descartado con razón
- [x] La migración de seed incluye instrucción para generar hashes reales antes de correrla
