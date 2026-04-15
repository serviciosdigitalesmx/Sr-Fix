# Modelo de Datos SDMX

## 1. Propósito

Este documento define el modelo de datos base para `Servicios Digitales MX`.

Su objetivo es establecer:

- entidades principales
- relaciones entre módulos
- reglas de multi-tenancy
- claves técnicas
- convenciones de auditoría

Este modelo está pensado para implementarse sobre:

- Supabase Postgres

## 2. Principio Rector

El sistema nuevo es multi-tenant.

Eso significa que:

- cada negocio es un tenant
- toda entidad operativa debe pertenecer a un tenant
- ninguna consulta debe mezclar datos entre tenants

## 3. Convenciones Generales

## 3.1 Claves primarias

Se recomienda usar:

- `uuid` como clave primaria técnica

Ejemplo:

- `id uuid primary key`

## 3.2 Timestamps

Toda tabla operativa debe incluir:

- `created_at`
- `updated_at`

Formato recomendado:

- `timestamptz`

## 3.3 Tenant ownership

Toda tabla operativa debe incluir:

- `tenant_id`

Excepción:

- tablas globales de catálogo solo si existen y si están diseñadas explícitamente para compartirse

## 3.4 Soft delete

Cuando aplique lógica de baja o archivado, se recomienda:

- `is_active boolean`
- o `archived_at timestamptz`

según el dominio

## 3.5 Usuarios de auditoría

En tablas sensibles se recomienda incluir:

- `created_by`
- `updated_by`

## 4. Núcleo de Tenancy

## 4.1 tenants

Representa cada negocio cliente del SaaS.

Campos sugeridos:

- `id`
- `name`
- `slug`
- `status`
- `plan`
- `contact_name`
- `contact_email`
- `contact_phone`
- `created_at`
- `updated_at`

Relaciones:

- un tenant tiene muchas sucursales
- un tenant tiene muchos usuarios
- un tenant tiene muchos clientes
- un tenant tiene muchas órdenes

## 4.2 branches

Representa sucursales del negocio.

Campos sugeridos:

- `id`
- `tenant_id`
- `name`
- `code`
- `address`
- `city`
- `state`
- `phone`
- `is_active`
- `created_at`
- `updated_at`

Relaciones:

- pertenece a un tenant
- una sucursal tiene muchas órdenes
- una sucursal tiene muchos movimientos de inventario

## 4.3 users

Representa usuarios internos del sistema.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id` opcional
- `auth_user_id` si se usa Supabase Auth
- `full_name`
- `email`
- `phone`
- `role`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

Relaciones:

- pertenece a un tenant
- puede pertenecer a una sucursal principal

## 5. Dominio de Clientes

## 5.1 customers

Representa clientes finales del taller.

Campos sugeridos:

- `id`
- `tenant_id`
- `full_name`
- `phone`
- `email`
- `tag`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

Restricciones recomendadas:

- índice por `tenant_id`
- índice por `phone`
- índice por `email`

Regla:

- no se permite mezclar clientes entre tenants

## 6. Dominio Operativo

## 6.1 service_orders

Representa la orden principal de reparación o servicio.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `customer_id`
- `folio`
- `status`
- `priority`
- `device_type`
- `device_brand`
- `device_model`
- `serial_number`
- `reported_issue`
- `internal_diagnosis`
- `estimated_cost`
- `final_cost`
- `promised_date`
- `received_at`
- `completed_at`
- `delivered_at`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Relaciones:

- pertenece a tenant
- pertenece a sucursal
- pertenece a cliente
- tiene muchas tareas
- tiene muchos archivos
- puede tener muchas refacciones consumidas

## 6.2 service_order_checklists

Checklist de recepción.

Campos sugeridos:

- `id`
- `tenant_id`
- `service_order_id`
- `has_charger`
- `screen_condition`
- `powers_on`
- `backup_required`
- `notes`
- `created_at`
- `updated_at`

## 6.3 service_order_status_history

Historial de cambios de estado.

Campos sugeridos:

- `id`
- `tenant_id`
- `service_order_id`
- `previous_status`
- `new_status`
- `comment`
- `changed_by`
- `created_at`

## 6.4 service_requests

Solicitudes o cotizaciones iniciales previas a una orden.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `customer_name`
- `customer_phone`
- `customer_email`
- `device_type`
- `device_model`
- `issue_description`
- `urgency`
- `status`
- `quoted_total`
- `deposit_amount`
- `balance_amount`
- `folio`
- `created_at`
- `updated_at`

## 7. Dominio de Tareas

## 7.1 tasks

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `service_order_id` opcional
- `service_request_id` opcional
- `title`
- `description`
- `status`
- `priority`
- `assigned_user_id`
- `due_date`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

## 7.2 task_history

Campos sugeridos:

- `id`
- `tenant_id`
- `task_id`
- `event_type`
- `comment`
- `changed_by`
- `created_at`

## 8. Dominio de Inventario

## 8.1 products

Campos sugeridos:

- `id`
- `tenant_id`
- `sku`
- `name`
- `category`
- `brand`
- `compatible_model`
- `primary_supplier_id`
- `cost`
- `sale_price`
- `minimum_stock`
- `unit`
- `location`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

Restricciones:

- `sku` único por tenant

## 8.2 branch_inventory

Stock por sucursal.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `product_id`
- `stock_current`
- `updated_at`

Restricciones:

- combinación única `tenant_id + branch_id + product_id`

## 8.3 inventory_movements

Movimientos de inventario.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `product_id`
- `service_order_id` opcional
- `purchase_order_id` opcional
- `movement_type`
- `quantity`
- `unit_cost`
- `reference`
- `notes`
- `created_by`
- `created_at`

Tipos sugeridos:

- `entry`
- `exit`
- `adjustment`
- `consumption`
- `transfer_out`
- `transfer_in`

## 8.4 stock_alerts

Tabla opcional si se quiere persistir estado de atención de alertas.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `product_id`
- `severity`
- `acknowledged_by`
- `acknowledged_at`
- `created_at`

## 9. Dominio de Proveedores y Compras

## 9.1 suppliers

Campos sugeridos:

- `id`
- `tenant_id`
- `business_name`
- `legal_name`
- `contact_name`
- `phone`
- `whatsapp`
- `email`
- `address`
- `city`
- `state`
- `categories`
- `lead_time_days`
- `payment_terms`
- `price_score`
- `speed_score`
- `quality_score`
- `reliability_score`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

## 9.2 purchase_orders

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `supplier_id`
- `folio`
- `status`
- `reference`
- `payment_terms`
- `expected_date`
- `related_service_order_id` opcional
- `subtotal`
- `tax_amount`
- `total`
- `notes`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

## 9.3 purchase_order_items

Campos sugeridos:

- `id`
- `tenant_id`
- `purchase_order_id`
- `product_id`
- `sku_snapshot`
- `product_name_snapshot`
- `qty_ordered`
- `qty_received`
- `unit_cost`
- `subtotal`
- `created_at`
- `updated_at`

## 10. Dominio Financiero

## 10.1 expenses

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `supplier_id` opcional
- `service_order_id` opcional
- `purchase_order_id` opcional
- `expense_type`
- `category`
- `concept`
- `description`
- `amount`
- `payment_method`
- `receipt_url`
- `notes`
- `expense_date`
- `created_by`
- `created_at`
- `updated_at`

## 10.2 customer_payments

Pagos del cliente sobre órdenes o cotizaciones.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id`
- `customer_id`
- `service_order_id` opcional
- `service_request_id` opcional
- `payment_type`
- `amount`
- `payment_method`
- `reference`
- `notes`
- `paid_at`
- `created_by`
- `created_at`

## 10.3 financial_snapshots

Tabla opcional para cierres o métricas precalculadas.

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id` opcional
- `period_type`
- `period_start`
- `period_end`
- `income_total`
- `expense_total`
- `gross_profit`
- `created_at`

## 11. Dominio de Evidencias y Archivos

## 11.1 file_assets

Campos sugeridos:

- `id`
- `tenant_id`
- `branch_id` opcional
- `service_order_id` opcional
- `service_request_id` opcional
- `file_type`
- `bucket_name`
- `storage_path`
- `public_url` opcional
- `uploaded_by`
- `created_at`

Tipos sugeridos:

- `reception_photo`
- `progress_photo`
- `delivery_photo`
- `receipt`
- `evidence`

## 12. Dominio de Notificaciones

## 12.1 notification_events

Campos sugeridos:

- `id`
- `tenant_id`
- `channel`
- `event_type`
- `recipient`
- `payload_json`
- `status`
- `sent_at`
- `created_at`

Canales sugeridos:

- `whatsapp`
- `email`

## 13. Relaciones Clave

Relaciones principales:

- `tenants -> branches`
- `tenants -> users`
- `tenants -> customers`
- `customers -> service_orders`
- `service_orders -> tasks`
- `service_orders -> service_order_status_history`
- `service_orders -> file_assets`
- `products -> inventory_movements`
- `products -> branch_inventory`
- `suppliers -> purchase_orders`
- `purchase_orders -> purchase_order_items`
- `purchase_orders -> inventory_movements`
- `expenses -> suppliers`
- `expenses -> purchase_orders`

## 14. Reglas de Integridad

Reglas mínimas recomendadas:

- `folio` único por tenant en órdenes
- `folio` único por tenant en solicitudes
- `sku` único por tenant
- no permitir movimientos de inventario sin `tenant_id`
- no permitir órdenes sin `tenant_id`
- no permitir usuarios sin `tenant_id`

## 15. Índices Recomendados

Índices recomendados:

- `tenant_id`
- `tenant_id, branch_id`
- `tenant_id, folio`
- `tenant_id, sku`
- `tenant_id, customer_id`
- `tenant_id, status`
- `tenant_id, created_at`

## 16. Vistas o Lecturas Agregadas Futuras

Con este modelo se podrán construir:

- KPIs por tenant
- KPIs por sucursal
- alertas de stock
- cuentas por cobrar
- reportes de rentabilidad
- clientes recurrentes
- servicios más frecuentes

## 17. Lo Que No Debe Hacerse

- guardar lógica de negocio fuerte solo en frontend
- usar tablas sin `tenant_id` en dominios operativos
- duplicar entidades que ya pueden relacionarse
- guardar binarios directamente en tablas relacionales
- diseñar el modelo copiando la forma de Google Sheets

## 18. Siguiente Entregable Recomendado

Después de este documento, el siguiente paso ideal es:

- `ESQUEMA_SQL_INICIAL_SDMX.sql`

Y después:

- arquitectura de proyectos
- backlog técnico por módulo
