# Backlog MVP SDMX

## 1. Objetivo

Este backlog define el trabajo mínimo necesario para construir el MVP de `Servicios Digitales MX`.

El MVP debe permitir operar un taller real con:

- multi-tenancy
- usuarios y roles
- órdenes de servicio
- seguimiento al cliente
- tareas
- inventario
- proveedores
- compras
- gastos
- finanzas y reportes básicos

## 2. Criterio del MVP

El MVP no necesita resolver todo el SaaS final.

Sí debe resolver bien:

- operación real del negocio
- separación por tenant
- flujo del cliente
- administración base

## 3. Prioridades

Etiquetas:

- `P0`: bloquea todo
- `P1`: núcleo operativo
- `P2`: administración crítica
- `P3`: consolidación y crecimiento

## 4. Backlog por Bloques

## P0. Base de Plataforma

### 4.1 Estructura de proyectos

Prioridad: `P0`

Objetivo:

- definir repos de frontend y backend
- estructura base del monorepo o repos separados

Entregables:

- estructura de proyectos
- convención de nombres
- README técnico inicial

### 4.2 Configuración de ambientes

Prioridad: `P0`

Objetivo:

- preparar `dev`, `staging` y `prod`

Entregables:

- variables de entorno
- configuración de Supabase
- configuración de Vercel
- configuración del backend ASP.NET

### 4.3 Base de datos inicial en Supabase

Prioridad: `P0`

Objetivo:

- ejecutar el esquema inicial

Entregables:

- base creada
- tablas creadas
- índices creados
- validación de relaciones

### 4.4 Autenticación base

Prioridad: `P0`

Objetivo:

- resolver acceso seguro al sistema

Entregables:

- login
- sesión
- usuarios activos/inactivos
- integración inicial con auth

### 4.5 Multi-tenancy base

Prioridad: `P0`

Objetivo:

- asegurar aislamiento entre negocios

Entregables:

- modelo de tenant funcional
- filtro por tenant en backend
- pruebas de aislamiento

## P1. Núcleo Operativo

### 4.6 Usuarios y roles

Prioridad: `P1`

Objetivo:

- definir permisos mínimos de operación

Entregables:

- roles:
  - admin
  - operativo
  - técnico
  - recepción
  - finanzas
- middleware o políticas de autorización

### 4.7 Sucursales

Prioridad: `P1`

Objetivo:

- soportar múltiples sucursales dentro de un tenant

Entregables:

- CRUD de sucursales
- sucursal activa
- filtros por sucursal

### 4.8 Clientes

Prioridad: `P1`

Objetivo:

- CRM ligero para clientes del taller

Entregables:

- alta y edición de clientes
- búsqueda
- historial básico
- etiquetas

### 4.9 Solicitudes / cotizaciones

Prioridad: `P1`

Objetivo:

- capturar intención inicial del cliente

Entregables:

- alta de solicitud
- cotización básica
- estado de solicitud
- conversión a orden

### 4.10 Órdenes de servicio

Prioridad: `P1`

Objetivo:

- construir el corazón operativo del sistema

Entregables:

- alta de orden
- folio
- cliente asociado
- dispositivo
- falla reportada
- diagnóstico interno
- fecha promesa
- costo estimado y final
- estados

### 4.11 Checklist de recepción

Prioridad: `P1`

Objetivo:

- capturar condiciones de entrada del equipo

Entregables:

- checklist
- notas
- integración con orden

### 4.12 Evidencias / fotos

Prioridad: `P1`

Objetivo:

- guardar fotos de recepción y avance

Entregables:

- carga de archivos
- storage en Supabase
- relación con orden

### 4.13 Historial de estados

Prioridad: `P1`

Objetivo:

- trazabilidad real del proceso

Entregables:

- cambios de estado
- bitácora
- visibilidad para cliente e internos

### 4.14 Portal del cliente

Prioridad: `P1`

Objetivo:

- permitir consulta por folio

Entregables:

- búsqueda por folio
- estado actual
- fotos/evidencias
- experiencia móvil

### 4.15 Semáforo operativo

Prioridad: `P1`

Objetivo:

- marcar urgencia o retraso

Entregables:

- lógica de tiempos
- estados visibles
- alertas operativas

## P2. Organización y Administración

### 4.16 Tareas

Prioridad: `P2`

Objetivo:

- organización interna del trabajo

Entregables:

- tareas
- asignación
- prioridad
- fecha límite
- relación con orden o solicitud

### 4.17 Inventario

Prioridad: `P2`

Objetivo:

- control de stock por sucursal

Entregables:

- catálogo de productos
- stock por sucursal
- movimientos
- consumo en reparación

### 4.18 Alertas de stock

Prioridad: `P2`

Objetivo:

- detectar productos bajo mínimo

Entregables:

- severidad
- vistas filtrables
- acción rápida a compras

### 4.19 Proveedores

Prioridad: `P2`

Objetivo:

- gestionar proveedores y evaluación

Entregables:

- alta/edición
- calificaciones
- integración con inventario y compras

### 4.20 Compras

Prioridad: `P2`

Objetivo:

- abastecimiento formal de inventario

Entregables:

- órdenes de compra
- partidas
- recepción parcial o total
- impacto en stock

### 4.21 Gastos

Prioridad: `P2`

Objetivo:

- control financiero mínimo de egresos

Entregables:

- registro de gastos
- categorías
- filtros
- relación con compras, proveedores y órdenes

## P3. Consolidación del Negocio

### 4.22 Pagos de clientes

Prioridad: `P3`

Objetivo:

- formalizar ingresos parciales y finales

Entregables:

- anticipo
- liquidación
- historial de pagos

### 4.23 Finanzas

Prioridad: `P3`

Objetivo:

- consolidar ingresos y egresos

Entregables:

- KPIs
- utilidad
- ticket promedio
- cuentas por cobrar

### 4.24 Reportes

Prioridad: `P3`

Objetivo:

- lectura operativa y gerencial

Entregables:

- diario
- semanal
- mensual
- por sucursal

### 4.25 Landing comercial

Prioridad: `P3`

Objetivo:

- presencia comercial del producto

Entregables:

- landing moderna
- propuesta de valor
- CTA a WhatsApp

### 4.26 Notificaciones por WhatsApp

Prioridad: `P3`

Objetivo:

- automatizar contacto clave con clientes

Entregables:

- eventos disparadores
- integración inicial con proveedor de WhatsApp

## 5. Dependencias Principales

### Dependencias del núcleo

- auth depende de base de plataforma
- multi-tenancy depende de modelo de datos y backend base
- órdenes depende de clientes y sucursales
- portal cliente depende de órdenes e historial

### Dependencias administrativas

- inventario depende de tenants y sucursales
- compras depende de proveedores e inventario
- gastos depende de proveedores y compras
- finanzas depende de órdenes, pagos, gastos y compras
- reportes depende de casi todo el dominio operativo

## 6. Orden Recomendado de Construcción

1. estructura de proyectos
2. ambientes
3. base de datos
4. auth
5. multi-tenancy
6. roles
7. sucursales
8. clientes
9. solicitudes
10. órdenes
11. checklist
12. evidencias
13. historial de estados
14. portal cliente
15. semáforo
16. tareas
17. inventario
18. alertas de stock
19. proveedores
20. compras
21. gastos
22. pagos
23. finanzas
24. reportes
25. landing
26. WhatsApp

## 7. Definición de Hecho del MVP

El MVP se considera operativo si:

- existe aislamiento real por tenant
- un negocio puede crear usuarios y sucursales
- se pueden registrar clientes
- se puede levantar una orden de servicio
- se puede consultar el estado por folio
- se puede registrar inventario y consumo básico
- se pueden registrar compras y gastos
- existen reportes y KPIs mínimos

## 8. Siguiente Entregable Recomendado

Después de este backlog, conviene crear:

- `ARQUITECTURA_DE_PROYECTOS_SDMX.md`

Y luego:

- bootstrap del frontend
- bootstrap del backend
- backlog técnico por sprint
