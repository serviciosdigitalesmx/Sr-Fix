/**
 * Configuración centralizada para HUB SaaS.
 * No reemplaza CONFIG legacy, solo añade metadatos de capa.
 */
const HUB_CONFIG = {
  VIEWS: {
    OPERATIVO: 'operativo',
    TECNICO: 'tecnico',
    CLIENTE: 'cliente'
  },
  ACTIONS: {
    DASHBOARD_SUMMARY: 'hub_dashboard_summary',
    OPERATIONAL_PANEL: 'hub_operational_panel',
    TECHNICIAN_PANEL: 'hub_technician_panel',
    CLIENT_PANEL: 'hub_client_panel'
  },
  SHEETS: {
    EQUIPOS: 'Equipos',
    CLIENTES: 'Clientes',
    SOLICITUDES: 'Solicitudes',
    TAREAS: 'Tareas',
    GASTOS: 'Gastos'
  }
};
