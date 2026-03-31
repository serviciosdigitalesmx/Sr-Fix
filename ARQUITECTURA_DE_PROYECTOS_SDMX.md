# Arquitectura de Proyectos SDMX

## 1. Propósito

Este documento define cómo se organizará técnicamente el sistema nuevo `Servicios Digitales MX`.

Su objetivo es dejar claro:

- cómo se divide el frontend, backend y base de datos
- qué vive en cada proyecto
- qué responsabilidades tiene cada capa
- qué convenciones vamos a seguir para crecer sin desorden

## 2. Principio Base

El sistema nuevo no debe construirse como un solo bloque mezclado.

Debe separarse en capas claras:

- frontend web
- backend API
- base de datos e infraestructura de Supabase

## 3. Arquitectura General

La arquitectura recomendada es:

- `frontend-web` en Next.js
- `backend-api` en ASP.NET Core
- `supabase` para SQL, auth, storage y políticas

## 4. Estrategia de Repositorio

La recomendación principal es usar un `monorepo`.

Ventajas:

- una sola fuente de verdad
- mejor coordinación entre frontend y backend
- documentación centralizada
- scripts compartidos
- más fácil versionar cambios transversales

## 5. Estructura Recomendada del Monorepo

```text
servicios-digitales-mx/
  apps/
    frontend-web/
    backend-api/
  infra/
    supabase/
      migrations/
      seed/
      policies/
  docs/
    CONTRATO_SERVICIOS_DIGITALES_MX.md
    MAPA_FUNCIONAL_SR_FIX_A_SDMX.md
    ROADMAP_MIGRACION_SDMX.md
    MODELO_DE_DATOS_SDMX.md
    BACKLOG_MVP_SDMX.md
  packages/
    shared-types/
    shared-constants/
  .env.example
  README.md
```

## 6. Responsabilidades por Proyecto

## 6.1 `apps/frontend-web`

Responsabilidad:

- toda la experiencia web del producto

Debe contener:

- landing comercial
- portal del cliente
- panel interno
- auth UI
- formularios
- dashboards
- componentes
- consumo de API

No debe contener:

- lógica crítica de negocio
- reglas de autorización profundas
- acceso directo inseguro a datos de otros tenants

## 6.2 `apps/backend-api`

Responsabilidad:

- lógica de negocio del sistema

Debe contener:

- endpoints HTTP
- auth server-side
- autorización
- lógica de tenant
- orquestación entre módulos
- reglas operativas
- validación fuerte
- integración con WhatsApp

No debe contener:

- maquetación de frontend
- lógica visual

## 6.3 `infra/supabase`

Responsabilidad:

- definición de base de datos e infraestructura asociada

Debe contener:

- migraciones SQL
- seeds
- políticas
- funciones SQL si hacen falta
- notas de configuración

## 6.4 `docs`

Responsabilidad:

- documentación viva del proyecto

Debe contener:

- contratos
- roadmap
- backlog
- decisiones técnicas
- guías de integración

## 6.5 `packages/shared-types`

Responsabilidad:

- tipos compartidos entre capas si se requieren

Uso recomendado:

- contratos de DTO
- enums compartidos
- nombres de estados
- respuestas esperadas del API

## 6.6 `packages/shared-constants`

Responsabilidad:

- constantes funcionales compartidas

Ejemplos:

- estados de órdenes
- prioridades
- categorías de gastos
- tipos de movimientos de inventario

## 7. Arquitectura del Frontend

## 7.1 Recomendación general

Usar Next.js con una estructura clara por dominios y áreas del producto.

Estructura sugerida:

```text
apps/frontend-web/
  src/
    app/
      (public)/
      (auth)/
      (dashboard)/
    components/
      ui/
      customers/
      service-orders/
      inventory/
      purchases/
      finance/
    features/
      auth/
      tenants/
      branches/
      customers/
      service-orders/
      requests/
      tasks/
      inventory/
      suppliers/
      purchases/
      expenses/
      finance/
      reports/
    lib/
      api/
      auth/
      utils/
      constants/
    styles/
```

## 7.2 Segmentación funcional

Frontend público:

- landing
- portal del cliente

Frontend privado:

- dashboard interno
- módulos administrativos y operativos

## 8. Arquitectura del Backend

## 8.1 Recomendación general

Usar ASP.NET Core organizado por dominios del negocio.

Estructura sugerida:

```text
apps/backend-api/
  src/
    Api/
    Application/
    Domain/
    Infrastructure/
```

## 8.2 Responsabilidad de cada capa

### `Api`

- controllers o endpoints
- middleware
- autenticación
- autorización
- serialización de respuestas

### `Application`

- casos de uso
- servicios de aplicación
- DTOs
- orquestación

### `Domain`

- entidades
- reglas de negocio
- interfaces
- enums

### `Infrastructure`

- acceso a datos
- repositorios
- integración con Supabase/Postgres
- integración con storage
- integración con WhatsApp

## 9. Organización por Dominios

Los dominios recomendados son:

- Auth
- Tenants
- Branches
- Users
- Customers
- ServiceRequests
- ServiceOrders
- Tasks
- Inventory
- Suppliers
- Purchases
- Expenses
- Finance
- Reports
- Files
- Notifications

## 10. Convención de API

Aunque el sistema viejo usaba `action`, el sistema nuevo puede evolucionar a endpoints más claros.

Ejemplo de estructura:

- `/api/health`
- `/api/auth`
- `/api/tenants`
- `/api/branches`
- `/api/customers`
- `/api/service-requests`
- `/api/service-orders`
- `/api/tasks`
- `/api/products`
- `/api/suppliers`
- `/api/purchase-orders`
- `/api/expenses`
- `/api/reports`

Regla:

- aunque la forma cambie, la intención funcional debe respetar el contrato del negocio

## 11. Estrategia de Integración con Supabase

Supabase se usará para:

- Postgres
- storage
- posiblemente auth

Reglas:

- migrations versionadas
- no cambios manuales ad hoc en producción
- estructura reproducible entre ambientes

## 12. Ambientes

Ambientes mínimos:

- `development`
- `staging`
- `production`

Cada ambiente debe tener:

- base propia
- variables propias
- configuración propia

## 13. Variables de Entorno

Se debe manejar un `.env.example` con al menos:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `API_BASE_URL`
- `DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_TOKEN`

## 14. Convenciones de Nombres

## 14.1 Frontend

- componentes en PascalCase
- hooks con prefijo `use`
- features por dominio

## 14.2 Backend

- endpoints por recurso
- servicios por caso de uso
- DTOs explícitos
- nombres de dominio claros

## 14.3 Base de datos

- tablas en snake_case plural
- columnas en snake_case
- claves foráneas terminadas en `_id`

## 15. Seguridad Estructural

Reglas:

- ningún endpoint debe devolver datos sin filtrar por tenant
- no confiar la seguridad al frontend
- las validaciones fuertes viven en backend
- los archivos deben segregarse por tenant

## 16. Observabilidad Inicial

Desde el inicio conviene contemplar:

- logs estructurados del backend
- trazas de errores
- monitoreo de fallos

No hace falta sobrecomplicar desde el día uno, pero sí dejar espacio para crecer.

## 17. Estrategia de Construcción

Orden recomendado:

1. crear estructura del monorepo
2. crear frontend-web
3. crear backend-api
4. crear carpeta de infra/supabase
5. montar migraciones iniciales
6. configurar variables
7. levantar primer flujo end-to-end

## 18. Primer Flujo Técnico End-to-End Recomendado

El primer flujo completo del sistema nuevo debería ser:

- login
- selección de tenant o contexto
- alta de cliente
- alta de orden
- consulta de orden por folio

Ese flujo valida el corazón del producto.

## 19. Qué No Debe Hacerse

- mezclar frontend y backend sin separación clara
- acoplar lógica de negocio al cliente
- construir tablas o endpoints fuera del contrato
- improvisar estructura de carpetas sin norma
- crecer sin documentación viva

## 20. Siguiente Entregable Recomendado

Después de este documento, lo más útil es crear uno de estos dos:

1. `ARBOL_DE_CARPETAS_INICIAL_SDMX.md`
2. `PLAN_TECNICO_SPRINT_1_SDMX.md`

Mi recomendación es seguir con:

- `PLAN_TECNICO_SPRINT_1_SDMX.md`
