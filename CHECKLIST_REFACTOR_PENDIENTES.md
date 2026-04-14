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
- [~] Migrar flujo Productos a Service+Repository
- [x] Mover listado Clientes a Service+Repository

## Fase 3 - Performance y robustez
- [x] Reducir indices fijos criticos en mapearFilaEquipo
- [~] Reducir lecturas masivas en listados criticos (paginacion por rango)
- [ ] Estandarizar normalizacion por entidad
- [x] Centralizar rutas/required fields en Router

## Fase 4 - Verificacion
- [ ] Smoke test de rutas migradas
- [ ] E2E destructivo completo en endpoint estable
- [ ] Cierre documental (bitacora + checklist final)
