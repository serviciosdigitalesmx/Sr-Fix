# CONTRATO SRFIX

## 1. Propósito

Este documento define la norma técnica oficial para extender, integrar, corregir y validar módulos dentro de `SrFix`.

Su objetivo es evitar:

- arquitectura improvisada
- módulos incompatibles entre sí
- duplicación innecesaria de datos
- regresiones al integrar cambios nuevos
- propuestas genéricas que no respeten la base real del sistema

Este contrato aplica a cualquier desarrollo futuro, ya sea hecho por una persona, por una IA o por un integrador interno.

## 2. Alcance

Este contrato cubre:

- frontend interno y público
- backend en Google Apps Script
- persistencia en Google Sheets
- integración de módulos dentro de `integrador.html`
- acciones `action` en `codigo.gs`
- estructuras de hojas y columnas
- reglas de multisucursal
- validación, QA y aceptación de entregas

## 3. Arquitectura Oficial

La arquitectura oficial de `SrFix` es esta:

- Frontend en HTML, CSS y JavaScript vanilla
- Backend en Google Apps Script
- Persistencia en Google Sheets
- Archivo backend principal: [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs)
- Integrador interno principal: [integrador.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/integrador.html)
- Cada módulo interno vive como:
  - `panel-<modulo>.html`
  - `panel-<modulo>.js`
- Los módulos se cargan en `integrador.html` mediante pestañas e `iframe`
- El backend expone operaciones a través de `doGet/doPost` usando el campo `action`
- Las respuestas del backend deben ser JSON homogéneo

## 4. Módulos Actuales del Sistema

Los módulos activos o integrados actualmente son:

- Operativo
- Técnico
- Solicitudes
- Archivo
- Tareas
- Stock
- Proveedores
- Compras
- Gastos
- Finanzas
- Reportes
- Sucursales
- Clientes
- Portal cliente
- PWA básica

## 5. Regla de Oro

Todo cambio nuevo debe:

- extender el sistema actual
- respetar la arquitectura actual
- reutilizar patrones existentes
- mantener compatibilidad hacia atrás

Todo cambio nuevo no debe:

- reescribir el sistema
- crear una arquitectura paralela
- meter otro stack
- romper módulos existentes

## 6. Lo Que Sí Se Permite

- crear `panel-<modulo>.html`
- crear `panel-<modulo>.js`
- agregar una pestaña nueva al integrador
- agregar nuevas `action` en `codigo.gs`
- crear hojas nuevas con helpers existentes
- ampliar hojas existentes de forma retrocompatible
- reutilizar datos de otros módulos
- agregar acciones rápidas entre módulos usando `localStorage`, folios, IDs o referencias controladas
- agregar validaciones frontend y backend
- agregar soporte multisucursal cuando el módulo lo requiera

## 7. Lo Que Está Prohibido

- proponer React, Vue, Angular, Node.js, Express, Firebase, Supabase o SQL
- reescribir `codigo.gs` desde cero
- cambiar el patrón `action` del backend
- sustituir Google Sheets como persistencia principal
- crear una navegación principal distinta a `integrador.html`
- crear otra API paralela
- duplicar datos si ya existe una fuente de verdad
- romper compatibilidad con registros viejos
- cambiar nombres de columnas existentes sin migración explícita
- hacer que un módulo nuevo dependa de acceso directo al repo si la IA no lo tiene

## 8. Estructura Oficial de Archivos

### 8.1 Backend

El backend oficial vive en:

- [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs)

Toda lógica nueva del servidor debe integrarse ahí.

### 8.2 Frontend de módulos

Todo módulo interno nuevo debe seguir el esquema:

- `panel-<modulo>.html`
- `panel-<modulo>.js`

Ejemplos existentes:

- [panel-stock.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-stock.html)
- [panel-stock.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-stock.js)
- [panel-proveedores.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-proveedores.html)
- [panel-proveedores.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-proveedores.js)
- [panel-compras.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-compras.html)
- [panel-compras.js](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/panel-compras.js)

### 8.3 Integración visual

Si un módulo es parte del sistema interno, debe integrarse en:

- [integrador.html](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/integrador.html)

Esto implica:

- botón de pestaña
- panel contenedor
- `iframe`
- registro en `FRAME_SRC`
- activación en el flujo de `mostrarModulo`

## 9. Contrato Oficial del Backend

### 9.1 Patrón obligatorio

Toda operación nueva debe exponerse mediante `action`.

Ejemplo conceptual:

```json
{
  "action": "listar_clientes",
  "page": 1,
  "pageSize": 50
}
```

### 9.2 Reglas del backend

- Toda action nueva debe agregarse al enrutamiento actual en `codigo.gs`
- Toda action nueva debe responder JSON
- Toda validación crítica debe existir en backend
- Toda hoja nueva debe crearse solo si no existe
- Toda ampliación de hoja existente debe mantener compatibilidad con datos anteriores
- Toda operación sensible debe usar helpers existentes antes de crear helpers nuevos

### 9.3 Helpers a reutilizar primero

Antes de crear helpers nuevos, se deben buscar equivalentes o patrones ya existentes en [codigo.gs](/Users/jesusvilla/Desktop/clonando%20y%20mejorando%20sr%20fix/Sr-Fix/codigo.gs), especialmente:

- `parsePaginacion`
- `paginarArreglo`
- `jsonResponse`
- `withRetry`
- `crearHojaSiNoExiste`
- `obtenerSiguienteFolio`
- helpers de fechas
- helpers de validación
- helpers de sucursal activa y migración

## 10. Contrato Oficial de Respuestas JSON

Toda respuesta del backend debe ser consistente.

### 10.1 Respuesta exitosa

```json
{
  "success": true
}
```

o una respuesta con payload:

```json
{
  "clientes": [],
  "total": 0,
  "page": 1,
  "pageSize": 50,
  "hasMore": false
}
```

### 10.2 Respuesta con error

```json
{
  "error": "mensaje de error"
}
```

### 10.3 Reglas

- No devolver HTML desde las actions
- No devolver estructuras mezcladas sin criterio
- No cambiar arbitrariamente los nombres de propiedades entre módulos equivalentes
- Si un listado usa paginación, siempre debe regresar `total`, `page`, `pageSize` y `hasMore`

## 11. Contrato Oficial de Paginación

Todo listado grande debe usar el patrón ya existente.

Campos mínimos esperados:

- `page`
- `pageSize`
- `total`
- `hasMore`

El backend debe paginar.
El frontend puede acumular páginas, pero no debe asumir que todos los registros vienen en una sola respuesta.

## 12. Contrato Oficial para Google Sheets

### 12.1 Reglas generales

- Toda hoja nueva debe crearse con helper y encabezados definidos
- Toda hoja nueva debe tener nombres de columnas claros, en mayúsculas y consistentes
- Toda hoja nueva debe tener `ID` o `FOLIO` como referencia estable, según corresponda
- Toda hoja nueva debe incluir fechas de creación y actualización cuando tenga sentido operativo

### 12.2 Naming oficial de hojas

Las hojas deben usar nombres descriptivos y consistentes con el dominio del sistema.

Ejemplos válidos:

- `Clientes`
- `Tareas`
- `Productos`
- `MovimientosStock`
- `Proveedores`
- `OrdenesCompra`
- `OrdenesCompraItems`
- `Gastos`
- `Sucursales`
- `InventarioSucursales`
- `TransferenciasStock`

### 12.3 Naming oficial de columnas

Reglas:

- mayúsculas
- snake o nombre continuo consistente
- sin nombres ambiguos
- evitar duplicidad semántica

Ejemplos válidos:

- `ID`
- `FOLIO_OC`
- `SKU`
- `NOMBRE`
- `ESTADO`
- `FECHA_CREACION`
- `FECHA_ACTUALIZACION`
- `SUCURSAL_ID`

## 13. Contrato Oficial de Multisucursal

Si un módulo afecta operación o datos por sucursal, debe respetar multisucursal.

Reglas:

- Debe considerar la sucursal activa cuando aplique
- Si se guardan registros nuevos, debe incluir `SUCURSAL_ID` cuando el dominio lo requiera
- Si se muestran listados, debe ser posible filtrar por sucursal o usar la activa
- Si hay datos viejos, deben mapearse a `Matriz` o equivalente por defecto
- No se debe romper la instalación de una sola sucursal

Dominios que normalmente sí deben respetar sucursal:

- Operativo
- Stock
- Compras
- Gastos
- Tareas
- Finanzas
- Reportes

## 14. Contrato Oficial del Frontend

### 14.1 Reglas generales

- Todo frontend nuevo debe ser HTML/CSS/JS vanilla
- Debe usar el estilo visual actual del sistema
- Debe reutilizar patrones de cards, tablas, filtros, modales y botones ya presentes
- Debe usar `fetch` contra la `BACKEND_URL` fija del sistema
- Debe soportar carga incremental cuando aplique

### 14.2 UX/UI oficial

El estilo base debe mantener:

- fondo oscuro
- azul `#1F7EDC`
- naranja `#FF6A2A`
- consistencia visual entre paneles
- botones y modales similares al ecosistema actual

No se debe:

- meter una identidad visual totalmente distinta
- usar UI que parezca de otro producto
- crear una navegación paralela

## 15. Contrato Oficial de Integración Entre Módulos

Si un módulo necesita integrarse con otro, debe hacerlo usando referencias reales y controladas.

Patrones válidos:

- folios
- IDs
- SKUs
- nombres de catálogo controlados
- borradores temporales en `localStorage` cuando la UX lo requiera

Ejemplos válidos:

- cliente -> operativo
- stock -> compras
- proveedores -> stock
- compras -> movimientos de stock
- sucursal activa -> filtros y guardado
- finanzas -> consolidación desde gastos/compras/equipos/solicitudes

## 16. Contrato Oficial de Validación

### 16.1 Backend

Todo dato importante debe validarse en backend.

Ejemplos:

- teléfono válido
- email válido
- cantidades numéricas
- costos no negativos
- estatus dentro de catálogo permitido
- existencia de SKU o folio relacionado cuando aplique

### 16.2 Frontend

El frontend debe validar para UX, pero no sustituye al backend.

Ejemplos:

- campos requeridos
- formato básico
- mensajes claros
- evitar envíos incompletos

## 17. Contrato Oficial de Manejo de Errores

Reglas:

- Todo error de backend debe regresar JSON con `error`
- El frontend debe mostrar mensajes entendibles
- No se deben ocultar fallos silenciosamente salvo casos no críticos
- Si un fallback GET/POST forma parte del patrón actual, puede mantenerse

## 18. Contrato Oficial de Retrocompatibilidad

Toda mejora debe ser retrocompatible.

Esto significa:

- no borrar columnas existentes sin migración
- no romper lectura de datos viejos
- no exigir nuevos campos en registros históricos sin estrategia de valor por defecto
- si se agrega una columna crítica, debe tener manejo para registros previos

## 19. Criterios de Aceptación

Un módulo se considera aceptable si:

- respeta la arquitectura oficial
- respeta el patrón de archivos del sistema
- expone actions compatibles con `codigo.gs`
- usa JSON consistente
- maneja validaciones mínimas
- no rompe módulos existentes
- respeta multisucursal si corresponde
- puede integrarse al flujo real del sistema
- tiene pasos de prueba claros

## 20. Criterios de Rechazo

Una entrega debe rechazarse si:

- propone otro stack
- exige reescribir el sistema
- rompe el patrón `integrador + panel + action`
- crea una base de datos paralela
- duplica información ya existente sin justificación
- ignora multisucursal cuando sí aplica
- no define payloads ni respuestas JSON
- no contempla compatibilidad hacia atrás
- parece “bonita” pero no aterriza al sistema real

## 21. Checklist de QA Obligatorio

Antes de aceptar un módulo, se debe revisar:

- pestaña nueva integrada correctamente en `integrador.html`
- `iframe` funcionando
- archivo HTML del módulo carga
- archivo JS del módulo carga
- actions del backend responden
- JSON tiene estructura esperada
- hoja nueva se crea si no existe
- columnas nuevas no rompen datos previos
- filtros funcionan
- guardado funciona
- edición funciona
- errores se muestran correctamente
- flujo entre módulos relacionado funciona
- sucursal activa se respeta si aplica
- sintaxis de JS validada
- sintaxis del backend validada

## 22. Estrategia de Trabajo con IA Externa

Si una IA no tiene acceso al repo:

- no se le debe pedir que “revise el proyecto”
- se le debe dar un contexto congelado del sistema
- se le debe exigir trabajar bajo este contrato
- la integración real al repo debe hacerla un integrador con acceso al código

Esto evita que la IA invente arquitectura o asuma cosas falsas del sistema.

## 23. Plantilla Base Para Cualquier Módulo Nuevo

Todo pedido futuro de módulo debe especificar, como mínimo:

- nombre del módulo
- objetivo del módulo
- archivos nuevos a crear
- archivos existentes a modificar
- actions nuevas
- hojas nuevas o columnas nuevas
- payloads mínimos
- JSON esperado
- integraciones con módulos existentes
- validaciones mínimas
- pruebas manuales mínimas

### Plantilla operativa

```text
Proyecto: SrFix

Usa como norma técnica obligatoria el documento CONTRATO_SR_FIX.md.

No tienes acceso directo al repositorio.
Debes trabajar exclusivamente bajo la arquitectura oficial del sistema:
- HTML/CSS/JS vanilla
- Google Apps Script
- Google Sheets
- codigo.gs como backend principal
- integrador.html como integrador interno principal
- panel-<modulo>.html + panel-<modulo>.js para módulos
- action en doGet/doPost

Reglas innegociables:
- No propongas otro stack
- No reescribas el sistema
- No rompas el patrón actual
- No dupliques datos innecesariamente
- Respeta multisucursal si aplica
- Mantén retrocompatibilidad

Necesito el módulo: <NOMBRE>

Entrega obligatoria:
- resumen del enfoque
- archivos nuevos
- archivos modificados
- actions nuevas
- hojas nuevas o columnas nuevas
- payloads
- respuestas JSON
- validaciones
- integraciones
- pasos de prueba
- riesgos o puntos delicados
```

## 24. Estado Actual del Contrato

Este contrato parte de la arquitectura real ya existente en el repo y debe actualizarse conforme cambie el sistema.

Si una práctica nueva se repite y demuestra ser correcta, debe incorporarse aquí.
Si una práctica existente genera deuda o regresiones, debe corregirse aquí y luego en el código.
