# Roadmap de Migración a Servicios Digitales MX

## 1. Objetivo

Definir el plan de trabajo para pasar de `SrFix` como prototipo operativo a `Servicios Digitales MX` como SaaS multi-tenant.

## 2. Estrategia General

La estrategia no es migrar código línea por línea.

La estrategia es:

- extraer reglas de negocio
- rediseñar arquitectura
- reconstruir módulos sobre el stack nuevo
- validar funcionalmente contra la experiencia real del prototipo

## 3. Fases del Roadmap

## Fase 0. Alineación

Objetivo:

- congelar visión, contrato y alcance

Entregables:

- contrato del sistema nuevo
- mapa funcional desde SrFix
- roadmap

Estado:

- en progreso con estos documentos

## Fase 1. Arquitectura Base

Objetivo:

- definir estructura técnica del nuevo sistema

Entregables:

- estructura de repositorios
- arquitectura frontend Next.js
- arquitectura backend ASP.NET Core
- configuración de Supabase
- estrategia de ambientes

Resultados esperados:

- base lista para empezar construcción

## Fase 2. Modelo de Datos

Objetivo:

- definir el modelo relacional del producto

Entregables:

- modelo de tenants
- modelo de usuarios y roles
- modelo de sucursales
- modelo de clientes
- modelo de equipos / órdenes
- modelo de tareas
- modelo de inventario
- modelo de proveedores
- modelo de compras
- modelo de gastos
- modelo de finanzas
- modelo de archivos

Resultados esperados:

- esquema SQL inicial
- relaciones claras
- reglas de aislamiento por tenant

## Fase 3. Seguridad y Acceso

Objetivo:

- construir auth y autorización reales

Entregables:

- login
- gestión de usuarios
- roles
- permisos
- aislamiento por tenant

Resultados esperados:

- acceso seguro y separación de negocios

## Fase 4. Núcleo Operativo

Objetivo:

- reconstruir el corazón del taller

Entregables:

- alta de orden
- captura de cliente
- captura de equipo
- estados
- semáforo
- historial técnico
- portal cliente base

Resultados esperados:

- flujo mínimo viable de operación

## Fase 5. Organización Interna

Objetivo:

- agregar control operativo interno

Entregables:

- tareas
- asignaciones
- prioridades
- seguimiento interno

## Fase 6. Administración

Objetivo:

- reconstruir la capa administrativa

Entregables:

- inventario
- proveedores
- compras
- gastos

## Fase 7. Inteligencia del Negocio

Objetivo:

- consolidar la capa analítica

Entregables:

- finanzas
- reportes
- indicadores por tenant y sucursal

## Fase 8. Experiencia Comercial

Objetivo:

- construir cara comercial del producto

Entregables:

- landing moderna
- branding
- CTAs
- onboarding comercial

## Fase 9. Comunicación y Automatización

Objetivo:

- integrar mensajes y notificaciones

Entregables:

- integración con WhatsApp
- mensajes por eventos
- recordatorios y seguimiento

## Fase 10. Cierre de Brecha con SrFix

Objetivo:

- validar que el nuevo sistema cubra lo esencial del prototipo

Entregables:

- checklist comparativo SrFix vs SDMX
- brechas funcionales
- decisiones de cierre

## 4. Orden Recomendado de Construcción

1. contrato y documentación base
2. arquitectura
3. modelo de datos
4. auth y tenants
5. sucursales
6. clientes
7. órdenes / equipos
8. portal cliente
9. tareas
10. inventario
11. proveedores
12. compras
13. gastos
14. finanzas
15. reportes
16. landing comercial
17. automatizaciones y WhatsApp

## 5. Riesgos Principales

### 5.1 Copiar el prototipo en vez de rediseñar

Riesgo:

- arrastrar deuda técnica de Apps Script al producto nuevo

### 5.2 Modelar mal multi-tenancy

Riesgo:

- fuga de datos entre negocios
- reescritura costosa después

### 5.3 Construir frontend sin contratos claros

Riesgo:

- inconsistencias entre módulos
- retrabajo de backend y UI

### 5.4 Saltar directo a módulos avanzados sin núcleo estable

Riesgo:

- producto bonito pero no operable

## 6. Definición de Éxito

La migración se considera bien encaminada si:

- el sistema nuevo mantiene la esencia funcional de SrFix
- mejora seguridad, concurrencia y escalabilidad
- soporta múltiples negocios sin mezclar datos
- ofrece mejor UX operativa
- puede crecer comercialmente como SaaS

## 7. Siguiente Paso Recomendado

Después de este roadmap, el siguiente entregable técnico debería ser:

- `MODELO_DE_DATOS_SDMX.md`

Y después:

- esquema SQL inicial
- arquitectura de carpetas/proyectos
- backlog por módulo
