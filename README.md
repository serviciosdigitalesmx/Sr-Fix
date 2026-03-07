# SRFIX Cloud - Sistema de Gestión de Taller

Proyecto web + Google Apps Script para gestionar recepción, diagnóstico y seguimiento de equipos.

## Enlaces finales (solo 2)

1. Clientes: `index.html`
2. Interno (integrador): `integrador.html`

## Cómo funciona

- `index.html`
  - Vista pública principal.
  - Si recibe `?view=portal`, redirige al portal cliente.
  - Soporta consulta directa por folio usando `?view=portal&folio=SRF-1234`.

- `integrador.html`
  - Entrada interna única.
  - Permite alternar entre módulos Operativo y Técnico sin repartir más enlaces.

## Archivos principales

- Front cliente: `Pagina-principal.html`, `portal-cliente.html`
- Front interno: `panel-operativo.html`, `panel-tecnico.html`, `integrador.html`
- Backend GAS: `codigo.gs`
