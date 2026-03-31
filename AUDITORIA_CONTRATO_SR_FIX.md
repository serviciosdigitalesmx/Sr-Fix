# Auditoría Contra CONTRATO_SR_FIX

Fecha de auditoría: 2026-03-29

## Resultado General

Estado general del sistema:

- La arquitectura base sí cumple el patrón oficial de `SrFix`
- No encontré motivo para tirar los módulos nuevos y rehacerlos desde cero
- Sí encontré ajustes importantes que conviene corregir antes de seguir metiendo más complejidad

Conclusión ejecutiva:

- `Cumple`: base arquitectónica general
- `Cumple con ajustes`: la mayoría de módulos nuevos
- `Ajuste importante inmediato`: navegación del integrador
- `Ajuste importante de rendimiento`: estadísticas de clientes
- `Ajuste estructural recomendado`: centralizar `BACKEND_URL`

## Hallazgos Principales

### 1. Integrador no reconoce correctamente algunos módulos nuevos

Severidad: Alta

Archivo:

- [integrador.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/integrador.html#L346)

Detalle:

La función `mostrarModulo` valida el módulo solicitado contra una lista permitida, pero esa lista no incluye `clientes`, `reportes` ni `sucursales`.

Eso provoca que cuando se intenta abrir alguno de esos módulos, el integrador fuerce `operativo` como módulo actual.

Impacto:

- navegación inconsistente
- pestañas nuevas visibles pero no realmente seleccionables bajo el flujo central
- incumplimiento del contrato de integración del `integrador.html`

Estado:

- requiere corrección inmediata

### 2. El módulo de Clientes hace lecturas y cruces completos por cada cliente

Severidad: Alta

Archivo:

- [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs#L1590)
- [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs#L1641)
- [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs#L1690)

Detalle:

`construirEstadisticasCliente` vuelve a cargar y recorrer datos globales de equipos y solicitudes para cada cliente individual.

Luego `listarClientes` llama esa función para cada fila de la hoja `Clientes`, lo que escala muy mal conforme crecen los datos.

Impacto:

- lentitud al listar clientes
- mayor costo de lectura sobre Sheets
- riesgo de timeouts en Apps Script cuando aumenten clientes, equipos y cotizaciones

Estado:

- requiere refactor de agregación por lote

### 3. La URL del backend está hardcodeada en demasiados archivos

Severidad: Media

Archivos representativos:

- [integrador.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/integrador.html#L287)
- [panel-clientes.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-clientes.js#L1)
- [panel-stock.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-stock.js#L1)
- [panel-compras.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-compras.js#L1)
- [panel-gastos.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-gastos.js#L1)
- [panel-finanzas.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-finanzas.js#L1)
- [panel-reportes.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-reportes.js#L1)

Detalle:

La misma URL de Apps Script está repetida en múltiples puntos del frontend.

Impacto:

- despliegues más frágiles
- riesgo de que una actualización de URL deje módulos mezclados entre versiones
- mantenimiento más costoso

Estado:

- recomendable corregir pronto con configuración central

## Estado Por Área

### 1. Arquitectura general

Estado: Cumple

Lo positivo:

- patrón `panel-<modulo>.html` + `panel-<modulo>.js`
- backend centralizado en `codigo.gs`
- integración por pestañas e `iframe`
- acciones por `action`
- uso consistente de JSON

### 2. Integrador

Estado: Cumple con ajuste importante

Lo positivo:

- pestañas nuevas agregadas
- `FRAME_SRC` actualizado
- `iframe` y fallback links presentes

Pendiente:

- corregir lista permitida en `mostrarModulo`

### 3. Backend

Estado: Cumple con ajustes

Lo positivo:

- las actions nuevas sí quedaron montadas dentro del patrón `doGet/doPost`
- hay consistencia general de respuestas JSON
- se mantiene el helper pattern del sistema

Pendientes:

- optimización de `Clientes`
- revisar crecimiento de `codigo.gs` para mantener secciones más ordenadas

### 4. Hojas y persistencia

Estado: Cumple con ajustes

Lo positivo:

- los módulos nuevos siguen usando Google Sheets
- se respeta la idea de hojas especializadas por dominio
- se mantiene retrocompatibilidad en varios puntos

Pendientes:

- revisar de forma más profunda si todas las ampliaciones de columnas están cubiertas por migración segura en producción real

### 5. Multisucursal

Estado: Cumple con ajustes

Lo positivo:

- ya existe base de `Sucursales`
- ya existe inventario por sucursal
- ya hay selector de sucursal activa en integrador

Pendientes:

- conviene validar extremo a extremo qué módulos sí filtran correctamente por `SUCURSAL_ID` y cuáles solo reciben el selector pero no consolidan perfecto con datos viejos

### 6. PWA

Estado: Cumple con reservas

Lo positivo:

- manifest
- service worker
- `pwa-init`
- assets

Reserva:

- la efectividad real depende del modo de despliegue final de Apps Script / hosting estático

### 7. Clientes

Estado: Cumple con ajuste importante

Lo positivo:

- módulo integrado
- historial
- edición
- acciones rápidas
- detección de duplicados

Pendiente crítico:

- refactor de cálculo de estadísticas para evitar escaneo completo por cliente

### 8. Tareas

Estado: Cumple

Lo positivo:

- patrón correcto de panel + action + hoja
- filtros
- estados
- prioridades

### 9. Stock

Estado: Cumple

Lo positivo:

- productos
- movimientos
- alertas
- integración con compras

### 10. Proveedores

Estado: Cumple

Lo positivo:

- catálogo dedicado
- filtros
- detalle
- calificaciones

### 11. Compras

Estado: Cumple

Lo positivo:

- órdenes
- items
- recepción parcial
- impacto en stock

### 12. Gastos

Estado: Cumple

Lo positivo:

- categorías
- filtros
- resumen
- relación con proveedor / folio

### 13. Finanzas

Estado: Cumple con validación pendiente

Lo positivo:

- consolida módulos reales
- respeta patrón del sistema

Pendiente:

- validar cálculos con datos reales de producción

### 14. Reportes

Estado: Cumple con validación pendiente

Lo positivo:

- usa action dedicada
- reutiliza datos existentes

Pendiente:

- probar con volumen real y sucursales activas

## Recomendación de Trabajo

No recomiendo borrar módulos y rehacerlos desde cero.

Sí recomiendo este orden:

1. Corregir navegación del integrador
2. Optimizar módulo `Clientes`
3. Centralizar configuración de `BACKEND_URL`
4. Hacer una segunda pasada de QA funcional por módulo en entorno real

## Dictamen Final

El sistema ya tiene suficiente consistencia como para seguir evolucionando sobre esta base.

No está en estado de demolición.
Sí está en estado de consolidación.

La estrategia correcta es:

- conservar lo ya integrado
- corregir puntos estructurales clave
- seguir usando el contrato como filtro
