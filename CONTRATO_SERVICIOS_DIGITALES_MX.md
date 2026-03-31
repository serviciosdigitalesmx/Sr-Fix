# CONTRATO SERVICIOS DIGITALES MX

## 1. Propósito

Este documento establece la verdad oficial del sistema nuevo `Servicios Digitales MX`.

Define:

- arquitectura objetivo
- stack oficial
- principios de negocio
- reglas de multi-tenancy
- módulos obligatorios
- restricciones técnicas
- criterios de diseño y escalabilidad

Todo desarrollo nuevo del ecosistema SaaS debe alinearse a este contrato.

## 2. Visión del Producto

`Servicios Digitales MX` será una plataforma SaaS multi-tenant para talleres, negocios de reparación y operaciones de servicio técnico.

Debe combinar:

- la potencia administrativa de una solución tipo Samii
- la agilidad operativa de un sistema de taller paso a paso
- una experiencia simple para usuarios no técnicos

## 3. Stack Oficial

### 3.1 Frontend

- React
- Next.js

### 3.2 Hosting Frontend

- Vercel

### 3.3 Backend

- ASP.NET Core

### 3.4 Base de datos y storage

- Supabase

Uso esperado de Supabase:

- Postgres para datos transaccionales
- Storage para archivos
- Auth si se decide integrarlo con el modelo de usuarios final

### 3.5 Integraciones

- API de WhatsApp para notificaciones y contacto directo con clientes

## 4. Principios Rectores

### 4.1 Multi-tenancy obligatorio

El sistema debe ser multi-tenant desde la base.

Regla central:

- ningún negocio puede ver datos de otro negocio

Todo dato operativo debe poder asociarse al tenant dueño.

### 4.2 Interfaz humana

La UX debe priorizar claridad operativa.

Esto implica:

- flujos paso a paso
- formularios entendibles
- estados visibles
- acciones claras
- baja fricción para personal operativo

### 4.3 Comunicación directa

El sistema debe facilitar comunicación rápida con el cliente final.

Canales principales:

- WhatsApp
- portal de seguimiento
- notificaciones ligadas al estado de la orden

### 4.4 Escalabilidad costo-efectiva

La plataforma debe poder crecer a múltiples locales y clientes sin disparar costos operativos.

## 5. Módulos Oficiales del Producto

## 5.1 Landing Comercial

Debe incluir:

- hero con propuesta de valor
- descripción de servicios o beneficios
- CTAs claros
- enlace a WhatsApp

## 5.2 Portal del Cliente

Debe incluir:

- consulta por folio
- estado en tiempo real
- fotos de avance
- evidencias visuales
- experiencia móvil cuidada

## 5.3 Panel Administrativo

Debe incluir:

- stock
- proveedores
- alertas de inventario
- órdenes de compra
- gastos
- finanzas y reportes

## 5.4 Panel Operativo

Debe incluir:

- alta de orden paso a paso
- checklist de recepción
- fotos de entrada
- fecha promesa
- captura clara de datos del cliente y equipo

## 5.5 Backend Core

Debe incluir:

- auth de usuarios
- control de tenants
- roles y permisos
- generador de folios
- lógica de estados y semáforo
- CRUD de solicitudes, órdenes y catálogos

## 6. Contrato de Multi-Tenancy

Todo dato del sistema nuevo debe modelarse con aislamiento por tenant.

Reglas:

- cada negocio es un tenant
- cada usuario pertenece a un tenant
- toda tabla operativa debe incluir referencia al tenant
- toda consulta del backend debe filtrar por tenant
- ningún endpoint puede devolver información cruzada entre tenants

Tablas que obligatoriamente deben depender del tenant:

- clientes
- equipos
- órdenes
- tareas
- productos
- movimientos de inventario
- proveedores
- compras
- gastos
- sucursales
- usuarios

## 7. Contrato de Dominios del Negocio

Los dominios centrales del producto son:

- tenants
- usuarios
- sucursales
- clientes
- equipos / órdenes de servicio
- solicitudes / cotizaciones
- tareas
- inventario
- proveedores
- compras
- gastos
- finanzas
- evidencias / archivos

## 8. Contrato de API

Las rutas y servicios del backend deben responder a operaciones reales del negocio.

Rutas críticas iniciales a respetar conceptualmente:

- `status`
- `equipo`
- `crear_solicitud`
- `semaforo`
- `archivar`

Estas rutas pueden evolucionar al estilo REST de ASP.NET Core, pero deben preservar la intención funcional del sistema original.

## 9. Contrato de Datos

La base oficial ya no será Google Sheets.

La fuente de verdad del sistema nuevo será:

- Supabase Postgres para datos
- Supabase Storage para archivos

Reglas:

- evitar duplicidad innecesaria
- usar claves primarias estables
- usar claves foráneas reales
- guardar fechas de creación y actualización
- auditar cambios relevantes cuando aplique

## 10. Contrato de Archivos y Evidencias

Las fotos, comprobantes y evidencias deben ir a storage estructurado.

Reglas:

- separar storage por tenant
- separar por dominio funcional cuando haga sentido
- no guardar binarios en la base relacional
- usar URLs seguras o firmadas según el caso

## 11. Contrato de Seguridad

La seguridad mínima esperada incluye:

- autenticación real
- autorización por rol
- aislamiento por tenant
- validación de acceso a archivos
- protección de endpoints
- no exponer datos de un negocio a otro

## 12. Contrato de UX/UI

El sistema nuevo debe sentirse moderno, confiable y rápido.

Reglas:

- frontend moderno con Next.js
- diseño profesional
- flujos simples
- priorizar móvil donde el caso lo requiera
- evitar UX confusa o demasiado técnica para personal operativo

## 13. Contrato de Escalabilidad

La arquitectura debe soportar crecimiento a múltiples negocios y sucursales.

Debe diseñarse pensando en:

- aislamiento por tenant
- consultas eficientes
- control de concurrencia
- crecimiento de archivos
- crecimiento de catálogos y movimientos

## 14. Contrato de Integración con WhatsApp

La comunicación con clientes debe poder dispararse desde eventos del sistema.

Eventos típicos:

- creación de orden
- cambio de estado
- orden lista
- recordatorio o seguimiento

## 15. Qué Sí Se Permite

- adoptar arquitectura moderna basada en Next.js + ASP.NET Core + Supabase
- modelado relacional formal
- auth robusta
- multi-tenancy real
- servicios de backend organizados por dominio
- separación entre frontend, backend y storage

## 16. Qué Está Prohibido

- usar Google Sheets como base definitiva del SaaS nuevo
- diseñar sin tenant isolation
- mezclar datos entre negocios
- improvisar estructura de roles
- construir UI sin considerar operación real de taller
- crear flujos que dependan de conocimiento técnico alto del usuario final

## 17. Relación con SrFix

`SrFix` debe tratarse como:

- referencia funcional
- prototipo operativo
- fuente de reglas de negocio y experiencia de usuario

Pero no como arquitectura final del SaaS nuevo.

## 18. Criterios de Aceptación de Nuevos Desarrollos

Una entrega del sistema nuevo se acepta si:

- respeta este stack oficial
- respeta aislamiento multi-tenant
- encaja con módulos oficiales
- cuida UX humana
- mantiene foco en escalabilidad
- no reintroduce dependencias del prototipo viejo

## 19. Estado del Documento

Este contrato debe actualizarse cuando cambie la arquitectura objetivo o se definan nuevos principios oficiales del producto.
