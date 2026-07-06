# Nexus CRM

Sistema de gestión (CRM) con módulos de autenticación, empleados/usuarios, proyectos, proveedores/clientes y **nóminas**. Monorepo con dos aplicaciones:

- `frontendCMR/` — React 19 + Vite + Tailwind CSS 4 (puerto **5173**).
- `backendCMR/` — Node.js + Express 5 + Prisma 7 + PostgreSQL (puerto **4000**).

---

## Requisitos previos

- **Node.js 18 o superior** (probado con Node 22) y npm.
- **PostgreSQL** corriendo localmente (puerto 5432 por defecto).

---

## 1. Base de datos

Crea una base de datos vacía llamada `nexus_crm` (una sola vez). Con `psql`:

```bash
psql -U postgres -c "CREATE DATABASE nexus_crm;"
```

> No necesitas crear tablas a mano: las migraciones de Prisma lo hacen por ti en el paso siguiente.

---

## 2. Backend (`backendCMR`)

```bash
cd backendCMR
npm install

# Copia y edita las variables de entorno
# PowerShell:
Copy-Item .env.example .env
# Bash:
# cp .env.example .env
```

Edita `backendCMR/.env` y ajusta al menos:

- `DATABASE_URL` con tu usuario/contraseña de PostgreSQL, por ejemplo:
  `postgresql://postgres:TU_PASSWORD@localhost:5432/nexus_crm?schema=public`
- `SEED_USER_PASSWORD` con la contraseña que tendrán los usuarios de prueba.

Genera los secretos JWT automáticamente y prepara la base de datos:

```bash
# Genera JWT_ACCESS_SECRET y JWT_REFRESH_SECRET en el .env
npm run env:secrets

# Genera el cliente de Prisma
npm run prisma:generate

# Aplica TODAS las migraciones (incluye las de nómina: dos tablas + configuración + tablas ISR)
npx prisma migrate deploy

# Siembra usuarios por rol + configuración de nómina + tablas ISR (semanal/quincenal/mensual)
npm run prisma:seed

# (Opcional) Datos demo de nómina: varias corridas con recibos, ligadas a los empleados registrados
npm run seed:payroll

# Levanta la API con recarga en caliente
npm run dev
```

La API queda en `http://localhost:4000/api` (prueba `http://localhost:4000/api/health`).

### Usuarios de prueba

El seed crea un usuario por rol. La contraseña es la que pusiste en `SEED_USER_PASSWORD`. En el primer inicio de sesión el sistema pide cambiarla.

| Rol       | Correo                     |
| --------- | -------------------------- |
| Admin     | `admin@nexuscrm.local`     |
| Líder     | `lider@nexuscrm.local`     |
| Operativo | `operativo@nexuscrm.local` |
| Contador  | `contador@nexuscrm.local`  |

> `npm run seed:payroll` genera recibos para los **empleados activos** existentes. Si partes de una base de datos vacía (sin empleados), primero crea empleados desde la app (módulo **Empleados**, como admin) y luego vuelve a ejecutarlo.

---

## 3. Frontend (`frontendCMR`)

En otra terminal:

```bash
cd frontendCMR
npm install

# Variables de entorno (opcional: los valores por defecto ya apuntan a la API local)
# PowerShell:
Copy-Item .env.example .env.local
# Bash:
# cp .env.example .env.local

npm run dev
```

Abre `http://localhost:5173` e inicia sesión con alguno de los usuarios de prueba.

---

## Base de datos: cambios y comandos útiles

Ya se aplicaron cambios al esquema (módulo de nómina). Estos son los comandos relevantes:

```bash
cd backendCMR

# Aplicar migraciones pendientes (uso normal tras hacer git pull)
npx prisma migrate deploy

# Volver a sembrar configuración/usuarios base (idempotente: no pisa datos existentes)
npm run prisma:seed

# Regenerar los datos demo de nómina (borra las nóminas y las recrea)
$env:RESET="1"; npm run seed:payroll      # PowerShell
# RESET=1 npm run seed:payroll             # Bash

# Explorar la base de datos con una UI web
npm run prisma:studio

# Verificar la conexión a la base de datos
npm run db:verify
```

> Si al ejecutar migraciones aparece un error de "drift" o el esquema cambió mucho en desarrollo, puedes recrear la base desde cero: elimina y vuelve a crear la base `nexus_crm`, y repite el paso 2 (`migrate deploy` → `prisma:seed` → `seed:payroll`).

---

## Scripts disponibles

**Backend (`backendCMR`)**

| Comando                   | Descripción                                                      |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | API con recarga en caliente (nodemon)                           |
| `npm start`               | API en modo producción                                          |
| `npm run env:secrets`     | Genera los secretos JWT en `.env`                               |
| `npm run prisma:generate` | Genera el cliente de Prisma                                     |
| `npm run prisma:migrate`  | Crea/aplica migraciones en desarrollo (interactivo)             |
| `npm run prisma:seed`     | Siembra usuarios por rol, configuración de nómina y tablas ISR  |
| `npm run seed:payroll`    | Datos demo de nómina (usa `RESET=1` para recrear)               |
| `npm run prisma:studio`   | UI web para explorar la base de datos                           |
| `npm run db:verify`       | Verifica la conexión a la base de datos                         |

**Frontend (`frontendCMR`)**

| Comando           | Descripción                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Servidor de desarrollo (Vite)        |
| `npm run build`   | Compila para producción              |
| `npm run preview` | Sirve la build de producción         |
| `npm run lint`    | Ejecuta ESLint                       |

---

## Resumen: arranque rápido

```bash
# Terminal 1 — Backend
cd backendCMR
npm install
Copy-Item .env.example .env        # y edita DATABASE_URL + SEED_USER_PASSWORD
npm run env:secrets
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run seed:payroll               # opcional (requiere empleados)
npm run dev

# Terminal 2 — Frontend
cd frontendCMR
npm install
npm run dev
```
