# Checklist de Pendientes Refactor Sr Fix

Estado legend:
- [ ] pendiente
- [~] en progreso
- [x] completado

## Fase 1 - Hardening
- [x] Fallback seguro de entrypoints (doGet/doPost)
- [x] Eliminar silent fail en bitacora de seguridad
- [x] Lock con retry/backoff
- [x] URL backend centralizable en frontend

## Fase 2 - Arquitectura por capas
- [x] Crear Core.gs
- [x] Crear Router.gs
- [x] Crear Repository.gs
- [x] Crear Services.gs
- [x] Crear Validators.gs
- [x] Crear Utils.gs
- [x] Migrar flujo Solicitudes a Service+Repository
- [x] Migrar flujo Tareas a Service+Repository
- [x] Migrar flujo Proveedores a Service+Repository
- [x] Migrar flujo Gastos a Service+Repository
- [x] Migrar flujo Productos a Service+Repository
- [x] Mover listado Clientes a Service+Repository

## Fase 3 - Performance y robustez
- [x] Reducir indices fijos criticos en mapearFilaEquipo
- [x] Reducir lecturas masivas en listados criticos (paginacion por rango)
- [x] Estandarizar normalizacion por entidad
- [x] Centralizar rutas/required fields en Router

## Fase 4 - Verificacion
- [~] Smoke test de rutas migradas
- [~] E2E destructivo completo en endpoint estable
- [ ] Cierre documental (bitacora + checklist final)

## Cierre 8 Puntos Críticos
- [x] `LockService` wrapper simplificado a `waitLock(timeout)` (sin while manual)
- [x] `mapearFilaEquipo` migrado a resolución dinámica de headers normalizados (sin alias hardcode por campo)
- [x] `crearEquipo` ya no carga toda la tabla de clientes para upsert (búsqueda puntual con `TextFinder`)
- [x] `doGetLegacy/doPostLegacy` migrados a registry de rutas (`Legacy_getGetRoutes/Legacy_getPostRoutes`)
- [x] Validación de campos requeridos centralizada antes de ejecutar handler (`Legacy_requireFields`)
- [x] Falla en bitácora ya no intenta reloguear en hoja bloqueada; error crítico a consola estructurada
- [x] Fechas con compatibilidad timestamp: `parseFechaFlexible` soporta epoch y se guardan campos `_TS` paralelos en flujo de equipos
- [x] `reporteOperativo` descompuesto en funciones de servicio (rango/resúmenes/detalles) para reducir función monolítica
