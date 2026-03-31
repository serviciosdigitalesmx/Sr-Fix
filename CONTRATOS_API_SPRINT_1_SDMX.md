# Contratos API Sprint 1 SDMX

## 1. Propósito

Este documento define los contratos API mínimos del Sprint 1 para `Servicios Digitales MX`.

Su objetivo es alinear:

- frontend
- backend
- modelo de datos

con un lenguaje común de requests y responses.

## 2. Alcance del Sprint 1

Estos contratos cubren únicamente el flujo base:

- health check
- auth inicial
- contexto del usuario
- clientes
- órdenes de servicio
- consulta pública por folio

## 3. Convenciones Generales

## 3.1 Base URL

Ejemplo conceptual:

```text
/api
```

## 3.2 Formato de respuesta exitosa

```json
{
  "success": true,
  "data": {}
}
```

## 3.3 Formato de respuesta con error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensaje legible"
  }
}
```

## 3.4 Metadata de listados

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "hasMore": false
  }
}
```

## 3.5 Headers esperados

Headers recomendados:

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

## 4. Health Check

## 4.1 GET `/api/health`

Objetivo:

- validar que el backend esté vivo

### Response 200

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "sdmx-api"
  }
}
```

## 5. Auth Inicial

## 5.1 POST `/api/auth/login`

Objetivo:

- autenticar usuario

### Request

```json
{
  "email": "usuario@negocio.com",
  "password": "123456"
}
```

### Response 200

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-o-token",
    "user": {
      "id": "uuid",
      "tenantId": "uuid",
      "branchId": "uuid",
      "fullName": "Juan Perez",
      "email": "usuario@negocio.com",
      "role": "admin"
    }
  }
}
```

### Errores esperados

- `INVALID_CREDENTIALS`
- `USER_INACTIVE`

## 5.2 GET `/api/auth/me`

Objetivo:

- obtener contexto del usuario autenticado

### Response 200

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "tenantId": "uuid",
      "branchId": "uuid",
      "fullName": "Juan Perez",
      "email": "usuario@negocio.com",
      "role": "admin"
    },
    "tenant": {
      "id": "uuid",
      "name": "Taller Centro",
      "slug": "taller-centro"
    }
  }
}
```

## 6. Clientes

## 6.1 POST `/api/customers`

Objetivo:

- crear cliente

### Request

```json
{
  "fullName": "Maria Lopez",
  "phone": "8181234567",
  "email": "maria@correo.com",
  "tag": "nuevo",
  "notes": "Cliente frecuente de Apple"
}
```

### Validaciones mínimas

- `fullName` requerido
- `phone` opcional pero si existe debe validarse
- `email` opcional pero si existe debe validarse

### Response 201

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "fullName": "Maria Lopez",
    "phone": "8181234567",
    "email": "maria@correo.com",
    "tag": "nuevo",
    "notes": "Cliente frecuente de Apple",
    "createdAt": "2026-03-29T12:00:00Z"
  }
}
```

## 6.2 GET `/api/customers`

Objetivo:

- listar clientes

### Query params sugeridos

- `page`
- `pageSize`
- `search`

### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Maria Lopez",
      "phone": "8181234567",
      "email": "maria@correo.com",
      "tag": "nuevo"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
}
```

## 6.3 GET `/api/customers/{id}`

Objetivo:

- obtener detalle de cliente

### Response 200

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Maria Lopez",
    "phone": "8181234567",
    "email": "maria@correo.com",
    "tag": "nuevo",
    "notes": "Cliente frecuente de Apple"
  }
}
```

## 7. Órdenes de Servicio

## 7.1 POST `/api/service-orders`

Objetivo:

- crear orden de servicio

### Request

```json
{
  "branchId": "uuid",
  "customerId": "uuid",
  "serviceRequestId": null,
  "deviceType": "Laptop",
  "deviceBrand": "Apple",
  "deviceModel": "MacBook Air M1",
  "serialNumber": "ABC123",
  "reportedIssue": "No enciende",
  "priority": "normal",
  "promisedDate": "2026-04-01",
  "estimatedCost": 1500
}
```

### Validaciones mínimas

- `branchId` requerido
- `customerId` requerido
- `deviceType` requerido
- `reportedIssue` requerido

### Response 201

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "branchId": "uuid",
    "customerId": "uuid",
    "folio": "ORD-000001",
    "status": "recibido",
    "deviceType": "Laptop",
    "deviceBrand": "Apple",
    "deviceModel": "MacBook Air M1",
    "reportedIssue": "No enciende",
    "priority": "normal",
    "promisedDate": "2026-04-01",
    "estimatedCost": 1500
  }
}
```

## 7.2 GET `/api/service-orders`

Objetivo:

- listar órdenes del tenant

### Query params sugeridos

- `page`
- `pageSize`
- `status`
- `branchId`
- `search`

### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "folio": "ORD-000001",
      "status": "recibido",
      "customerName": "Maria Lopez",
      "deviceType": "Laptop",
      "deviceModel": "MacBook Air M1",
      "promisedDate": "2026-04-01"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  }
}
```

## 7.3 GET `/api/service-orders/{id}`

Objetivo:

- obtener detalle interno de una orden

### Response 200

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folio": "ORD-000001",
    "status": "recibido",
    "customer": {
      "id": "uuid",
      "fullName": "Maria Lopez",
      "phone": "8181234567",
      "email": "maria@correo.com"
    },
    "deviceType": "Laptop",
    "deviceBrand": "Apple",
    "deviceModel": "MacBook Air M1",
    "reportedIssue": "No enciende",
    "estimatedCost": 1500,
    "promisedDate": "2026-04-01"
  }
}
```

## 7.4 GET `/api/service-orders/by-folio/{folio}`

Objetivo:

- consulta interna por folio

### Response 200

Igual al detalle interno, filtrado por tenant.

## 8. Portal Cliente

## 8.1 GET `/api/portal/orders/{folio}`

Objetivo:

- consulta pública o semipública por folio

### Response 200

```json
{
  "success": true,
  "data": {
    "folio": "ORD-000001",
    "status": "recibido",
    "deviceType": "Laptop",
    "deviceModel": "MacBook Air M1",
    "reportedIssue": "No enciende",
    "promisedDate": "2026-04-01",
    "progressPhotos": []
  }
}
```

### Reglas

- no devolver información sensible administrativa
- no devolver datos cruzados entre tenants
- la búsqueda por folio debe resolver solo dentro del contexto correcto del negocio

## 9. Códigos de Error Recomendados

Catálogo mínimo:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `INVALID_CREDENTIALS`
- `USER_INACTIVE`
- `TENANT_CONTEXT_REQUIRED`
- `INTERNAL_ERROR`

## 10. Reglas de Seguridad

- todos los endpoints privados requieren autenticación
- toda lectura privada debe filtrar por `tenantId`
- el frontend nunca decide el tenant real por sí solo sin validación de backend
- el portal por folio debe tener controles para no mezclar datos entre negocios

## 11. DTOs Recomendados

DTOs mínimos del Sprint 1:

- `LoginRequest`
- `LoginResponse`
- `CurrentUserResponse`
- `CreateCustomerRequest`
- `CustomerResponse`
- `CustomerListItemResponse`
- `CreateServiceOrderRequest`
- `ServiceOrderResponse`
- `ServiceOrderListItemResponse`
- `PortalOrderResponse`

## 12. Definición de Hecho de los Contratos

Estos contratos se consideran listos cuando:

- frontend y backend usan la misma estructura
- los nombres de propiedades quedan cerrados
- el modelo de datos soporta estos DTOs
- no hay ambigüedad en auth o tenant context

## 13. Siguiente Entregable Recomendado

Después de estos contratos, lo más útil es pasar a una de estas dos rutas:

1. crear el proyecto nuevo y empezar Sprint 1
2. redactar `ARBOL_DE_CARPETAS_INICIAL_SDMX.md`

Mi recomendación es:

- empezar ya el proyecto nuevo
