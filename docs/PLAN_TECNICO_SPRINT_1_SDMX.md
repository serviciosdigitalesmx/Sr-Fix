# Plan Técnico Sprint 1 SDMX

## 1. Objetivo del Sprint

Construir la base técnica mínima del nuevo sistema `Servicios Digitales MX` para poder arrancar el primer flujo funcional end-to-end.

El objetivo del Sprint 1 no es terminar el producto.

El objetivo es dejar operativo este flujo:

- login
- contexto de tenant
- alta de cliente
- alta de orden
- consulta de orden por folio

## 2. Resultado Esperado del Sprint

Al terminar este sprint debe existir:

- estructura de proyectos creada
- base de datos inicial montada
- backend inicial funcional
- frontend inicial funcional
- flujo mínimo operativo validado

## 3. Alcance

Este sprint cubre:

- setup del monorepo
- setup de frontend
- setup de backend
- setup de Supabase
- auth base
- tenants base
- clientes base
- órdenes base
- consulta por folio base

No cubre todavía:

- tareas
- inventario
- compras
- gastos
- finanzas
- reportes
- WhatsApp

## 4. Bloques de Trabajo

## 4.1 Monorepo y estructura inicial

Objetivo:

- crear la base física del proyecto

Entregables:

- carpeta raíz del proyecto nuevo
- `apps/frontend-web`
- `apps/backend-api`
- `infra/supabase`
- `docs`
- `packages/shared-types`
- `packages/shared-constants`
- `README.md`
- `.env.example`

Definition of done:

- estructura creada
- nombres consistentes
- proyecto inicial documentado

## 4.2 Supabase inicial

Objetivo:

- tener la base lista para desarrollo

Entregables:

- proyecto Supabase creado
- esquema SQL inicial aplicado
- validación de tablas y relaciones

Definition of done:

- tablas existentes
- índices existentes
- sin errores de migración

## 4.3 Backend ASP.NET Core inicial

Objetivo:

- tener API mínima corriendo

Entregables:

- proyecto ASP.NET Core creado
- estructura `Api / Application / Domain / Infrastructure`
- health check
- configuración de conexión
- middleware base

Definition of done:

- backend compila
- backend levanta local
- endpoint de salud responde

## 4.4 Frontend Next.js inicial

Objetivo:

- tener web base corriendo

Entregables:

- proyecto Next.js creado
- layout base
- ruta pública base
- ruta privada base
- integración con auth inicial

Definition of done:

- frontend compila
- frontend levanta local
- navegación base funcional

## 4.5 Auth y contexto de tenant

Objetivo:

- controlar acceso y separar negocio

Entregables:

- login base
- sesión base
- asociación de usuario a tenant
- validación mínima de acceso

Definition of done:

- usuario autenticado puede entrar
- usuario no autenticado no accede a rutas privadas
- backend recibe contexto de tenant

## 4.6 Dominio de clientes base

Objetivo:

- registrar y consultar clientes

Entregables:

- endpoint crear cliente
- endpoint listar clientes
- endpoint obtener cliente
- formulario frontend base
- tabla/listado básico

Definition of done:

- se puede crear cliente
- se puede listar cliente
- se guarda por tenant

## 4.7 Dominio de órdenes base

Objetivo:

- registrar una orden de servicio mínima

Entregables:

- endpoint crear orden
- endpoint obtener orden por id
- endpoint consultar orden por folio
- formulario base de alta

Campos mínimos:

- cliente
- folio
- tipo de equipo
- modelo
- falla reportada
- estado
- fecha promesa

Definition of done:

- se puede crear orden
- se puede consultar por folio
- la orden queda ligada a tenant y sucursal

## 4.8 Portal básico de consulta por folio

Objetivo:

- validar que el cliente pueda consultar su orden

Entregables:

- pantalla pública simple
- input de folio
- consulta al backend
- respuesta con estado mínimo

Definition of done:

- el folio devuelve la orden correcta
- no expone datos de otro tenant

## 5. Historias Técnicas del Sprint

### Historia 1

Como equipo técnico, necesitamos crear la estructura inicial del proyecto para poder construir sobre una base ordenada.

### Historia 2

Como backend, necesitamos una base de datos inicial con tenants, usuarios, clientes y órdenes.

### Historia 3

Como usuario interno, necesito autenticarme para entrar al panel del sistema.

### Historia 4

Como recepcionista u operador, necesito registrar clientes.

### Historia 5

Como operador, necesito crear una orden de servicio.

### Historia 6

Como cliente final, necesito consultar mi orden por folio.

## 6. Dependencias del Sprint

Orden recomendado interno:

1. estructura de proyectos
2. Supabase
3. backend
4. frontend
5. auth
6. clientes
7. órdenes
8. portal por folio

## 7. Riesgos del Sprint

### 7.1 Definir tarde auth/tenant

Riesgo:

- construir flujos que luego haya que reescribir por aislamiento multi-tenant

### 7.2 Saltar directo a UI sin backend listo

Riesgo:

- duplicar trabajo
- contratos débiles entre frontend y backend

### 7.3 Querer meter demasiados módulos

Riesgo:

- sprint inflado
- base inestable

## 8. Entregables Concretos

Al cierre del Sprint 1 deben existir como mínimo:

- proyecto nuevo inicializado
- SQL base aplicado
- backend base corriendo
- frontend base corriendo
- login base
- CRUD mínimo de clientes
- alta mínima de orden
- consulta pública por folio

## 9. Criterios de Aceptación del Sprint

El Sprint 1 se considera exitoso si:

- el sistema nuevo ya corre localmente
- existe separación por tenant
- se puede iniciar sesión
- se puede registrar un cliente
- se puede registrar una orden
- se puede consultar una orden por folio

## 10. Qué Sigue Después del Sprint 1

Sprint 2 recomendado:

- sucursales completas
- checklist de recepción
- evidencias / archivos
- historial de estados
- panel operativo mejorado

## 11. Siguiente Entregable Recomendado

Después de este plan, lo más útil es crear:

- `CONTRATOS_API_SPRINT_1_SDMX.md`

Ese documento debe definir:

- endpoints iniciales
- request DTOs
- response DTOs
- errores esperados
