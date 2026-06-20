# Plan de pendientes - CRM/CMR

## Contexto del proyecto

El proyecto actual tiene un frontend en React + Vite + Tailwind. En este momento usa datos mock en memoria y login simulado. La arquitectura planeada para completar el sistema es:

- Frontend: React + Vite + Tailwind.
- Backend/API: Node.js + Express.
- Logica de negocio: servicios para nominas, Gantt, proyectos, cotizaciones y reportes.
- Base de datos: PostgreSQL + Prisma ORM.
- Despliegue futuro: Vercel para frontend y Railway para backend/base de datos.
- Trabajo inicial: una sola persona implementara las fases 1 a 10 durante esta semana.
- Trabajo colaborativo posterior: el repositorio en GitHub quedara preparado para integrar al equipo despues.

## Decisiones tomadas

- Se trabajara como monorepo con dos carpetas principales:
  - `frontendCMR/`
  - `backendCMR/`
- En esta etapa se implementara solo autenticacion + empleados.
- Proyectos y proveedores/clientes se dejaran documentados para migrarlos despues a base de datos.
- PostgreSQL aparentemente ya esta instalado localmente; se debe verificar antes de crear Prisma.
- Se crearan usuarios de prueba por rol.
- Al crear un empleado con acceso al sistema, se podra generar una contrasena temporal automaticamente.
- Tambien debe existir la opcion de asignar una contrasena manualmente.
- El nombre oficial del sistema sera Nexus CRM.
- Los roles oficiales en base de datos seran `admin`, `lider`, `operativo` y `contador`.
- El login usara idealmente correo institucional del usuario del sistema, pero tambien podra aceptar correo personal cuando aplique.
- La recuperacion de contrasena se implementara.
- El campo de salario integrado IMSS quedara preparado, pero su calculo automatico queda para una etapa posterior.
- Prisma creara el esquema y las migraciones desde cero.
- Los empleados se desactivaran por defecto para conservar historicos.
- La eliminacion permanente de empleados sera excepcional: solo para rol `admin` y registros creados por error.
- Esta semana el desarrollo lo realizara una sola persona.
- El flujo de ramas puede iniciar simple sobre `main` o con ramas `feature/*`, y formalizarse cuando se integren las demas integrantes.

## Roles y permisos esperados

| Rol | Usuarios | Nominas | Proveedores | Insumos | Proyectos | Reportes |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Total | Total | Total | Total | Total | Total |
| Lider | Solo lectura | Solo lectura | Total | Total | Total | Total |
| Operativo | Sin acceso | Solo lectura | Solo lectura | Editar | Tareas asignadas | Solo lectura |
| Contador | Sin acceso | Total | Solo lectura | Solo lectura | Sin acceso | Total |

Notas:

- El frontend debe ocultar modulos, pantallas y botones segun el rol.
- El backend debe validar permisos en cada endpoint. La seguridad real no debe depender solo del frontend.

## Modelo de autenticacion esperado

### Tabla de usuarios/sesion

Campos base:

- id usuario: UUID, llave primaria.
- nombre completo.
- correo institucional: unico, recomendado para login.
- correo personal: opcional, puede usarse como alternativa de login cuando aplique.
- contrasena: hash bcrypt.
- rol: enum `admin`, `lider`, `operativo`, `contador`.
- activo: boolean.
- fecha de registro.
- ultimo acceso.

Tokens/sesion:

- access token JWT: duracion aproximada de 15 minutos.
- refresh token: duracion aproximada de 7 dias.
- token de reseteo: hash, un solo uso.
- expira en: timestamp.
- IP de ultimo acceso.
- dispositivo/user-agent.

### Flujo de login

1. Usuario ingresa correo y contrasena.
2. Frontend envia credenciales al endpoint `POST /auth/login`.
3. Backend busca el correo en la base de datos y compara la contrasena con bcrypt.
4. Si falla 5 veces, la cuenta se bloquea temporalmente por 15 minutos.
5. Si es correcto, backend genera access token y refresh token.
6. El JWT incluye id de usuario, rol y expiracion.
7. Refresh token se guarda en cookie HttpOnly.
8. El access token se mantiene en memoria del frontend, no en localStorage.
9. Cada peticion protegida incluye `Authorization: Bearer <token>`.
10. Middleware del backend valida token y permisos por rol.
11. Si el access token expira, el frontend usa refresh token para renovar sesion.
12. Al cerrar sesion se invalida el refresh token en base de datos.

## Reglas de negocio y seguridad

- La contrasena nunca se guarda en texto plano; siempre usar bcrypt con salt.
- 5 intentos fallidos bloquean la cuenta por 15 minutos.
- Al cerrar sesion se invalida el refresh token en base de datos.
- El token de reseteo de contrasena expira en 1 hora y solo se usa una vez.
- Cada modulo del frontend verifica rol antes de renderizar botones de accion.
- Cada endpoint del backend verifica rol antes de ejecutar acciones.
- Las validaciones importantes deben existir en frontend y backend.

## Empleados vs usuarios del sistema

Un empleado es una persona real de la organizacion. No necesariamente tiene acceso al sistema. Un usuario del sistema es una cuenta que puede iniciar sesion.

### Campos esperados para empleado

- id empleado: UUID, llave primaria.
- nombre completo.
- CURP: obligatorio, 18 caracteres, unico y con formato valido.
- RFC: unico.
- NSS/IMSS.
- fecha de nacimiento.
- sexo: M, F u Otro.
- estado civil.
- telefono.
- correo personal.
- correo institucional si se requiere asociarlo al usuario del sistema.
- direccion.
- puesto/cargo.
- area/departamento.
- fecha de ingreso.
- tipo de contrato: base, temporal u honorarios.
- salario diario.
- salario integrado IMSS: campo preparado; calculo automatico pendiente para etapa posterior.
- banco y CLABE.
- activo: boolean.
- usuario del sistema: FK opcional a usuarios.

### Reglas para empleados

- La CURP es obligatoria y debe tener exactamente 18 caracteres con formato valido.
- RFC debe ser unico si se captura.
- CLABE bancaria debe tener 18 digitos exactos.
- Salario diario debe ser mayor a 0.
- Salario integrado IMSS queda preparado, pero el calculo automatico se implementara despues.
- Un empleado puede existir sin usuario del sistema.
- Un empleado idealmente no se elimina; se marca como inactivo para conservar historicos.
- La eliminacion permanente solo la puede hacer `admin` y debe reservarse para registros creados por error.
- Al desactivar un empleado, su usuario del sistema se desactiva automaticamente tambien.

## Relaciones con otros modulos

Nominas:

- Cada recibo de nomina apunta a un empleado.
- Usa salario diario, NSS, CURP y tipo de contrato para calcular IMSS, ISR y neto a pagar.

Proyectos:

- Los empleados se asignan como involucrados en proyectos.
- Su salario diario se usa para calcular costos estimados.

Autenticacion:

- Al dar de alta un empleado se puede crear o no un usuario del sistema con correo y rol.

Reportes:

- Reportes de nomina y proyectos muestran nombre, puesto y area del empleado.
- El directorio de personal sale directamente de la tabla de empleados.

## Fases de implementacion

### Fase 1 - Preparacion del proyecto y repositorio

- Crear/ordenar repositorio en GitHub.
- Usar estructura monorepo:
  - `/frontendCMR`
  - `/backendCMR`
- Agregar `.gitignore` correcto para Node, builds y variables de entorno.
- Crear archivo `.env.example` para frontend y backend.
- Mantener el repositorio listo para colaboracion posterior, aunque esta semana trabaje una sola persona.
- Documentar pendientes y decisiones para que el equipo pueda integrarse despues sin perder contexto.

### Fase 2 - Backend base

- Crear proyecto Node.js + Express.
- Configurar Prisma.
- Conectar PostgreSQL local.
- Crear migraciones iniciales.
- Crear estructura:
  - rutas.
  - controladores.
  - servicios.
  - middlewares.
  - validaciones.
  - configuracion.

### Fase 3 - Base de datos inicial

- Modelar tablas de usuarios/sesion.
- Modelar tabla de empleados.
- Modelar roles como enum.
- Crear relaciones empleado-usuario.
- Agregar indices y restricciones unicas.
- Crear seed con usuarios de prueba por rol.

Usuarios seed recomendados:

| Rol | Correo sugerido |
| --- | --- |
| Admin | `admin@demo.com` |
| Lider | `lider@demo.com` |
| Operativo | `operativo@demo.com` |
| Contador | `contador@demo.com` |

La contrasena de seed debe definirse en desarrollo y cambiarse antes de cualquier despliegue real.

### Fase 4 - Autenticacion real

- Endpoint `POST /auth/login`.
- Endpoint `POST /auth/refresh`.
- Endpoint `POST /auth/logout`.
- Endpoint para solicitar recuperacion de contrasena.
- Endpoint para restablecer contrasena con token de un solo uso.
- Hash bcrypt.
- JWT access token.
- Refresh token en cookie HttpOnly.
- Bloqueo por intentos fallidos.
- Middleware `authRequired`.
- Middleware `requireRole` o `requirePermission`.

### Fase 5 - Integracion del frontend con auth real

- Reemplazar login simulado.
- Crear cliente API con Axios.
- Guardar access token en memoria.
- Manejar refresh automatico.
- Proteger rutas segun sesion.
- Redirigir segun rol/permisos.
- Ocultar modulos no permitidos.
- Ocultar botones no permitidos.

### Fase 6 - Modulo empleados/usuarios

- Rehacer formulario de empleados con todos los campos requeridos.
- Validar CURP, RFC, CLABE, salario, correo y campos obligatorios.
- Crear empleado.
- Editar empleado.
- Desactivar empleado.
- Eliminar empleado solo si se permite.
- Crear usuario del sistema opcional al crear empleado.
- Asignar rol si se crea usuario.
- Permitir generar contrasena temporal para el usuario del sistema.
- Permitir capturar contrasena manual si se requiere.
- Desactivar usuario automaticamente si se desactiva empleado.
- Conectar lista de empleados al backend.
- Agregar filtros por estado, area, puesto y busqueda.

### Fase 7 - Responsividad

- Revisar login en movil, tablet y desktop.
- Revisar sidebar y bottom nav.
- Ajustar tablas para movil con cards o scroll controlado.
- Revisar formularios largos.
- Revisar modales y botones.
- Validar que no haya textos cortados ni acciones inaccesibles.

### Fase 8 - Seguridad y reglas de negocio

- Validaciones espejo en frontend y backend.
- Pruebas de acceso por rol.
- Pruebas de endpoint con usuarios no autorizados.
- Manejo de errores 401 y 403.
- Confirmar que no se use localStorage para access token.
- Confirmar que refresh token se invalida al logout.

### Fase 9 - Modulos posteriores

- Proyectos con base de datos.
- Proveedores/clientes con base de datos.
- Insumos.
- Nominas.
- Reportes PDF/Excel.
- Gantt.

Notas para migracion posterior:

- El modulo de proyectos actualmente usa `proyectosMock` y empleados mock.
- Cuando se conecte a base de datos, los involucrados deben apuntar a empleados reales por `empleadoId`.
- El costo de proyectos debe calcularse con salario diario o salario asignado segun regla final.
- El modulo de proveedores/clientes actualmente usa `proveedoresMock`.
- Cuando se conecte a base de datos, RFC debe validarse como unico.
- Las reglas de permisos ya deben quedar listas desde auth para que estos modulos puedan reutilizarlas.

### Fase 10 - Preparacion para despliegue

- Variables de entorno para produccion.
- Frontend en Vercel.
- Backend y PostgreSQL en Railway.
- Configurar CORS.
- Configurar cookies seguras en produccion.
- Probar flujo completo en entorno publicado.

## Preguntas pendientes antes de implementar

1. Que significa exactamente "tareas asignadas" para Operativo en proyectos?
2. Hay rubrica del profesor para login, seguridad o base de datos? Si existe, debe copiarse aqui para convertirla en checklist.

## Primer bloque recomendado de trabajo

Para avanzar sin abrir demasiados frentes, el primer bloque deberia ser:

1. Subir el proyecto a GitHub con estructura limpia.
2. Crear backend Express + Prisma + PostgreSQL.
3. Crear modelos de usuarios, sesiones y empleados.
4. Crear seed con usuarios de prueba por rol.
5. Implementar login real.
6. Conectar frontend al login real.
7. Proteger rutas y mostrar menu segun rol.
8. Completar formulario/listado de empleados contra BD.
