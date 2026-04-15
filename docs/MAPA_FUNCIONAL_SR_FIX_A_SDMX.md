# Mapa Funcional SrFix a Servicios Digitales MX

## 1. Objetivo

Este documento conecta el sistema actual `SrFix` con la plataforma nueva `Servicios Digitales MX`.

Sirve para identificar:

- qué módulos del sistema actual se conservan como lógica de negocio
- qué módulos deben rediseñarse
- qué módulos deben evolucionar
- qué capacidades nuevas debe tener el SaaS multi-tenant

## 2. Principio Base

`SrFix` no se migra tal cual.

Se usa como:

- referencia funcional
- base de experiencia operativa
- fuente de flujos y reglas del negocio

`Servicios Digitales MX` se construye como producto nuevo sobre otra arquitectura.

## 3. Mapa General

| SrFix actual | Estado en SDMX | Acción |
| :--- | :--- | :--- |
| Landing pública | Se conserva como concepto | Rediseñar en Next.js |
| Portal cliente | Se conserva | Rehacer sobre backend moderno |
| Panel operativo | Se conserva | Rehacer con arquitectura nueva |
| Panel técnico | Se conserva parcialmente | Reestructurar dentro del panel interno SaaS |
| Solicitudes / cotizaciones | Se conserva | Rehacer con modelo relacional |
| Archivo histórico | Se conserva como capacidad | Replantear como vistas filtradas y archivado lógico |
| Tareas | Se conserva | Rehacer |
| Stock | Se conserva | Rehacer |
| Proveedores | Se conserva | Rehacer |
| Compras | Se conserva | Rehacer |
| Gastos | Se conserva | Rehacer |
| Finanzas | Se conserva | Rehacer con mejor consolidación |
| Reportes | Se conserva | Rehacer |
| Sucursales | Evoluciona | Integrar como parte del modelo multi-tenant |
| Clientes | Se conserva | Rehacer como CRM ligero por tenant |
| PWA | Evoluciona | Resolver al final sobre Next.js |

## 4. Capacidades de SrFix que Sí Deben Migrarse

## 4.1 Operación de taller

Se debe migrar:

- alta de orden
- folio
- captura de cliente
- captura de equipo
- estado del proceso
- fecha promesa
- fotos de recepción
- historial de trabajo

## 4.2 Seguimiento al cliente

Se debe migrar:

- consulta por folio
- seguimiento del estado
- visualización de evidencias
- acceso a WhatsApp

## 4.3 Gestión administrativa

Se debe migrar:

- inventario
- proveedores
- compras
- gastos
- finanzas
- reportes

## 4.4 Organización interna

Se debe migrar:

- tareas
- responsables
- prioridad
- relación con órdenes

## 5. Capacidades que Cambian de Forma Importante

## 5.1 Autenticación

En SrFix actual:

- acceso simple por contraseña y sesión ligera

En SDMX nuevo:

- auth real
- usuarios
- roles
- permisos
- tenant isolation

## 5.2 Persistencia

En SrFix actual:

- Google Sheets

En SDMX nuevo:

- Postgres en Supabase

## 5.3 Archivos

En SrFix actual:

- manejo acoplado al flujo existente

En SDMX nuevo:

- storage formal por tenant

## 5.4 Multiempresa

En SrFix actual:

- enfoque de taller único evolucionado a sucursales

En SDMX nuevo:

- multi-tenant real desde la base

## 6. Capacidades Nuevas Que Debe Tener SDMX

Además de migrar la lógica de SrFix, el sistema nuevo debe sumar:

- tenant isolation formal
- onboarding de negocios
- usuarios por negocio
- roles y permisos más robustos
- administración comercial SaaS
- facturación o suscripción si luego aplica
- observabilidad y despliegue formal

## 7. Módulos del Sistema Nuevo y Su Origen

| Módulo SDMX | Base funcional en SrFix | Observación |
| :--- | :--- | :--- |
| Landing comercial | Landing / página principal | Rediseño total |
| Portal cliente | Portal cliente | Mantener esencia |
| Operación de órdenes | Panel operativo + técnico | Unificar mejor experiencia |
| Solicitudes y cotizaciones | Solicitudes | Convertir a dominio formal |
| Clientes | Captura actual + clientes avanzados | CRM ligero por tenant |
| Inventario | Stock | Migrar a modelo relacional |
| Proveedores | Proveedores | Migración directa de dominio |
| Compras | Compras | Mantener lógica de recepción |
| Gastos | Gastos | Mantener categorías, mejorar consolidación |
| Finanzas | Finanzas | Rehacer cálculos sobre DB real |
| Reportes | Reportes | Rehacer sobre consultas optimizadas |
| Sucursales | Multisucursal | Integrar dentro de tenant |
| Usuarios y roles | No existe formalmente en SrFix | Crear desde cero |

## 8. Prioridad de Migración Funcional

Orden recomendado:

1. tenants, usuarios y auth
2. sucursales
3. clientes
4. órdenes/equipos
5. portal cliente
6. tareas
7. inventario
8. proveedores
9. compras
10. gastos
11. finanzas
12. reportes
13. landing comercial

## 9. Qué No Debe Migrarse Tal Cual

No debe copiarse literalmente:

- estructura basada en Sheets
- login simple por contraseña fija
- hardcodeo de URLs
- patrón de integración por iframes
- dependencia directa de Apps Script

## 10. Resultado Esperado

Al terminar la migración conceptual:

- se conserva la lógica útil de SrFix
- se elimina la deuda del prototipo
- nace un SaaS multi-tenant listo para crecer
