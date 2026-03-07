# SRFIX Cloud - Sistema de Gestión de Taller

Proyecto web + Google Apps Script para gestionar recepción, diagnóstico y seguimiento de equipos.

## Enlaces finales (solo 2)

1. Clientes: `index.html`
2. Interno (integrador): `integrador.html`

## Cómo funciona

- `index.html`
  - Vista pública principal.
  - Incluye botón directo al panel del cliente (`portal-cliente.html`).

- `integrador.html`
  - Entrada interna única.
  - Permite alternar entre módulos Operativo y Técnico sin repartir más enlaces.

## Archivos principales

- Front cliente: `Pagina-principal.html`, `portal-cliente.html`
- Front interno: `panel-operativo.html`, `panel-tecnico.html`, `integrador.html`
- Backend GAS: `codigo.gs`
