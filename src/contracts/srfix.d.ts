export {};

declare global {
  const CONFIG: {
    API_URL: string;
    APP_URL?: string;
    FRONT_PASSWORD?: string;
  };

  namespace SrFix {
    type DateISO = string;
    type MoneyCents = number;
    type TenantId = string;
    type BranchId = string;
    type UserId = string;
    type Folio = string;
    type PermissionKey = string;
    type ModuleId =
      | 'operativo'
      | 'tecnico'
      | 'solicitudes'
      | 'archivo'
      | 'clientes'
      | 'tareas'
      | 'stock'
      | 'proveedores'
      | 'compras'
      | 'gastos'
      | 'finanzas'
      | 'reportes'
      | 'sucursales'
      | 'seguridad'
      | 'portal'
      | 'landing';

    type RoleName = 'admin' | 'operativo' | 'supervisor' | 'tecnico' | 'cliente' | string;

    interface ApiError {
      success: false;
      error: string;
      data?: null;
    }

    interface ApiSuccess<T> {
      success: true;
      data: T;
      error?: null;
    }

    type ApiResponse<T> = ApiSuccess<T> | ApiError;

    interface AuthUser {
      USUARIO: string;
      NOMBRE: string;
      ROL: RoleName;
      ACTIVO: boolean;
      NOTAS?: string;
      FECHA_CREACION?: DateISO;
      FECHA_ACTUALIZACION?: DateISO;
    }

    interface AuthSession {
      user: AuthUser;
      tenantId?: TenantId;
      branchId?: BranchId;
      token?: string;
      expiresAt?: number;
    }

    interface LoginInput {
      usuario: string;
      password: string;
    }

    interface LoginResult {
      success: boolean;
      user?: AuthUser;
      error?: string;
      tenantId?: TenantId;
      branchId?: BranchId;
      role?: RoleName;
    }

    interface AuthClaims {
      tenantId: TenantId;
      branchId?: BranchId;
      userId: UserId;
      role: RoleName;
    }

    interface TenantContext {
      tenantId: TenantId;
      branchId?: BranchId;
      userId?: UserId;
      role?: RoleName;
    }

    interface SecurityGuardOptions {
      forcePrompt?: boolean;
    }

    interface AdminAuthorization {
      ok: boolean;
      password?: string;
      fromCache?: boolean;
      error?: string;
    }

    interface SecurityGuardApi {
      ensureAdminPassword(reason?: string, options?: SecurityGuardOptions): Promise<AdminAuthorization>;
      attachAdminPassword(payload?: Record<string, unknown>, reason?: string, options?: SecurityGuardOptions): Promise<Record<string, unknown> | null>;
      clearAdminPassword(): void;
      hasAdminPassword(): boolean;
    }

    interface ModuleMeta {
      title: string;
      subtitle: string;
    }

    interface SolicitudRecord {
      ID?: string;
      FOLIO_COTIZACION: Folio;
      FECHA_SOLICITUD?: DateISO;
      NOMBRE: string;
      TELEFONO: string;
      EMAIL?: string;
      DISPOSITIVO: string;
      MODELO?: string;
      PROBLEMAS?: string;
      DESCRIPCION?: string;
      URGENCIA?: string;
      ESTADO?: string;
      FECHA_COTIZACION?: DateISO;
      COTIZACION_JSON?: string;
      COTIZACION_TOTAL?: MoneyCents;
      FOLIO_COTIZACION_MANUAL?: Folio;
      SUCURSAL_ID?: BranchId;
      SOLICITUD_ORIGEN_IP?: string;
    }

    interface CotizacionItem {
      concepto: string;
      cantidad: number;
      precio: MoneyCents;
      total: MoneyCents;
    }

    interface CotizacionResumen {
      subtotal: MoneyCents;
      iva: MoneyCents;
      total: MoneyCents;
      anticipo: MoneyCents;
      saldo: MoneyCents;
      aplicaIva: boolean;
      ivaRate: number;
    }

    interface CotizacionPayload {
      version: '1.0';
      moneda: 'MXN';
      items: CotizacionItem[];
      notas: string;
      aplicaIva: boolean;
      ivaRate: number;
      subtotal: MoneyCents;
      iva: MoneyCents;
      total: MoneyCents;
      anticipo: MoneyCents;
      saldo: MoneyCents;
    }

    interface SolicitudesListResponse {
      solicitudes: SolicitudRecord[];
      total: number;
      page: number;
      pageSize: number;
      hasMore: boolean;
    }

    interface SolicitudResponse {
      solicitud: SolicitudRecord;
    }

    interface ArchivarCotizacionResponse {
      success?: boolean;
      folioCotizacionManual?: Folio;
      error?: string;
    }

    interface ArchivoRecord {
      TIPO_ARCHIVO?: string;
      FECHA_ARCHIVO?: DateISO;
      FOLIO: Folio;
      CLIENTE: string;
      TELEFONO?: string;
      DETALLE?: string;
      TOTAL?: MoneyCents | number | string;
      ESTADO?: string;
      NOTAS?: string;
      DESCRIPCION?: string;
      PROBLEMAS?: string;
      URGENCIA?: string;
      EMAIL?: string;
      DISPOSITIVO?: string;
      MODELO?: string;
      FECHA_SOLICITUD?: DateISO | string;
      FECHA_COTIZACION?: DateISO | string;
      FECHA_INGRESO?: DateISO | string;
      FECHA_ENTREGA?: DateISO | string;
      FECHA_ULTIMA_ACTUALIZACION?: DateISO | string;
      SEGUIMIENTO_CLIENTE?: string;
      CASO_RESOLUCION_TECNICA?: string;
      COTIZACION_JSON?: string;
      FOTO_RECEPCION?: string;
      CHECK_CARGADOR?: string;
      CHECK_PANTALLA?: string;
      CHECK_PRENDE?: string;
      CHECK_RESPALDO?: string;
      FOLIO_COTIZACION_MANUAL?: Folio;
    }

    interface ArchivoListResponse {
      archivo: ArchivoRecord[];
      total: number;
      page: number;
      pageSize?: number;
      hasMore: boolean;
    }

    interface ArchivoDetalleResponse {
      registro: ArchivoRecord;
      raw?: Record<string, unknown>;
      reabrible?: boolean;
    }

    interface ClienteRecord {
      ID?: string;
      NOMBRE: string;
      TELEFONO?: string;
      EMAIL?: string;
      ETIQUETA?: string;
      NOTAS?: string;
      moroso?: boolean;
      totalEquipos?: number;
      totalCotizaciones?: number;
      totalReparaciones?: number;
      ticketPromedio?: MoneyCents | number | string;
      ultimaVisita?: DateISO | string;
    }

    interface ClienteHistorialEquipo {
      FOLIO?: Folio;
      TIPO?: string;
      MODELO?: string;
      FALLA?: string;
      DIAGNOSTICO?: string;
      ESTADO?: string;
      FECHA_INGRESO?: DateISO | string;
      FECHA_ENTREGA?: DateISO | string;
      COSTO_ESTIMADO?: MoneyCents | number | string;
    }

    interface ClienteHistorialCotizacion {
      folio?: Folio;
      dispositivo?: string;
      modelo?: string;
      descripcion?: string;
      problemas?: string;
      total?: MoneyCents | number | string;
      estado?: string;
    }

    interface ClienteHistorial {
      totalEquipos?: number;
      totalReparaciones?: number;
      totalCotizaciones?: number;
      ticketPromedio?: MoneyCents | number | string;
      ultimaVisita?: DateISO | string;
      equipos?: ClienteHistorialEquipo[];
      cotizaciones?: ClienteHistorialCotizacion[];
    }

    interface ClientesListResponse {
      clientes: ClienteRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      duplicados?: string[];
    }

    interface ClienteDetailResponse {
      cliente?: ClienteRecord;
      historial?: ClienteHistorial;
    }

    interface TareaRecord {
      ID?: string;
      FOLIO_TAREA: Folio;
      TITULO: string;
      DESCRIPCION?: string;
      ESTADO?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada' | string;
      PRIORIDAD?: 'baja' | 'media' | 'alta' | 'urgente' | string;
      RESPONSABLE?: string;
      FECHA_LIMITE?: DateISO | string;
      TIPO_RELACION?: 'general' | 'equipo' | 'solicitud' | string;
      FOLIO_RELACIONADO?: Folio | string;
      NOTAS?: string;
      SucursalID?: BranchId | string;
    }

    interface TareasMetricas {
      pendientes?: number;
      urgentes?: number;
      completadas?: number;
    }

    interface TareasListResponse {
      tareas: TareaRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      metricas?: TareasMetricas;
      responsables?: string[];
    }

    interface TareaDetailResponse {
      tarea?: TareaRecord;
      error?: string;
    }

    interface StockProductoRecord {
      SKU: string;
      NOMBRE: string;
      PROVEEDOR?: string;
      CATEGORIA?: string;
      MARCA?: string;
      MODELO_COMPATIBLE?: string;
      ESTATUS?: 'activo' | 'inactivo' | string;
      STOCK_ACTUAL?: number | string;
      STOCK_MINIMO?: number | string;
      COSTO?: MoneyCents | number | string;
      PRECIO?: MoneyCents | number | string;
      UNIDAD?: string;
      UBICACION?: string;
      NOTAS?: string;
      ALERTA_STOCK?: boolean;
      ALERTA_NIVEL?: 'bajo' | 'critico' | 'agotado' | string;
      SUCURSAL_ID?: BranchId | string;
    }

    interface StockMovimientoRecord {
      FECHA?: DateISO | string;
      TIPO_MOVIMIENTO?: 'entrada' | 'salida' | 'ajuste' | 'consumo' | string;
      CANTIDAD?: number | string;
      COSTO_UNITARIO?: MoneyCents | number | string;
      FOLIO_EQUIPO?: Folio | string;
      REFERENCIA?: string;
      USUARIO?: string;
      NOTAS?: string;
    }

    interface StockFoliosRelacionResponse {
      folios?: Array<{ folio: Folio }>;
    }

    interface StockMovimientosResponse {
      movimientos?: StockMovimientoRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    }

    interface StockListResponse {
      productos: StockProductoRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      filtros?: {
        categorias?: string[];
        marcas?: string[];
        proveedores?: string[];
      };
    }

    interface ProveedorRecord {
      ID?: string;
      NOMBRE_COMERCIAL: string;
      RAZON_SOCIAL?: string;
      CONTACTO?: string;
      TELEFONO?: string;
      WHATSAPP?: string;
      EMAIL?: string;
      DIRECCION?: string;
      CIUDAD_ESTADO?: string;
      CATEGORIAS?: string;
      TIEMPO_ENTREGA?: string;
      CONDICIONES_PAGO?: string;
      CALIFICACION_PROMEDIO?: number | string;
      CALIFICACION_PRECIO?: number | string;
      CALIFICACION_RAPIDEZ?: number | string;
      CALIFICACION_CALIDAD?: number | string;
      CALIFICACION_CONFIABILIDAD?: number | string;
      ESTATUS?: 'activo' | 'inactivo' | string;
      NOTAS?: string;
    }

    interface ProveedoresListResponse {
      proveedores: ProveedorRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      filtros?: {
        categorias?: string[];
      };
    }

    interface ProveedorDetailResponse {
      proveedor?: ProveedorRecord;
      error?: string;
    }

    interface OrdenCompraRecord {
      ID?: string | number;
      FOLIO_OC: Folio;
      FECHA?: DateISO | string;
      PROVEEDOR: string;
      ESTADO?: 'borrador' | 'enviada' | 'parcialmente_recibida' | 'recibida' | 'cancelada' | string;
      REFERENCIA?: string;
      CONDICIONES_PAGO?: string;
      FECHA_ESTIMADA?: DateISO | string;
      FOLIO_RELACIONADO?: Folio | string;
      NOTAS?: string;
      SUBTOTAL?: MoneyCents | number | string;
      IVA_PORCENTAJE?: number | string;
      IVA_MONTO?: MoneyCents | number | string;
      TOTAL?: MoneyCents | number | string;
      SUCURSAL_ID?: BranchId | string;
      FECHA_CREACION?: DateISO | string;
      FECHA_ACTUALIZACION?: DateISO | string;
      folio?: Folio;
      estado?: string;
      proveedor?: string;
      referencia?: string;
      condicionesPago?: string;
      fechaEstimada?: DateISO | string;
      folioRelacionado?: Folio | string;
      notas?: string;
      subtotal?: MoneyCents | number | string;
      ivaPorcentaje?: number | string;
      ivaMonto?: MoneyCents | number | string;
      total?: MoneyCents | number | string;
      sucursalId?: BranchId | string;
    }

    interface OrdenCompraItemRecord {
      ID?: string | number;
      FOLIO_OC: Folio;
      ITEM_ID?: number | string;
      SKU: string;
      PRODUCTO: string;
      CANTIDAD_PEDIDA?: number | string;
      COSTO_UNITARIO?: MoneyCents | number | string;
      CANTIDAD_RECIBIDA?: number | string;
      SUBTOTAL?: MoneyCents | number | string;
      FECHA_CREACION?: DateISO | string;
      FECHA_ACTUALIZACION?: DateISO | string;
      folio?: Folio;
      itemId?: number | string;
      sku?: string;
      producto?: string;
      cantidadPedida?: number | string;
      costoUnitario?: MoneyCents | number | string;
      cantidadRecibida?: number | string;
      subtotal?: MoneyCents | number | string;
    }

    interface OrdenCompraListResponse {
      ordenes: OrdenCompraRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      proveedores?: Array<{ nombre: string }>;
    }

    interface OrdenCompraDetailResponse {
      orden?: OrdenCompraRecord;
      items?: OrdenCompraItemRecord[];
      error?: string;
    }

    interface OrdenCompraGuardadoResponse {
      success?: boolean;
      folio?: Folio;
      orden?: OrdenCompraRecord;
      error?: string;
    }

    interface OrdenCompraRecepcionItemInput {
      itemId: number;
      cantidadRecibida: number;
    }

    interface OrdenCompraRecepcionResponse {
      success?: boolean;
      folio?: Folio;
      estado?: string;
      usuario?: string;
      error?: string;
    }

    interface GastoRecord {
      ID?: string | number;
      FECHA: DateISO | string;
      TIPO?: 'fijo' | 'variable' | string;
      CATEGORIA?: string;
      CONCEPTO: string;
      DESCRIPCION?: string;
      MONTO?: MoneyCents | number | string;
      METODO_PAGO?: string;
      PROVEEDOR?: string;
      FOLIO_RELACIONADO?: Folio | string;
      COMPROBANTE_URL?: string;
      NOTAS?: string;
      SUCURSAL_ID?: BranchId | string;
      FECHA_CREACION?: DateISO | string;
      FECHA_ACTUALIZACION?: DateISO | string;
      fecha?: DateISO | string;
      tipo?: string;
      categoria?: string;
      concepto?: string;
      descripcion?: string;
      monto?: MoneyCents | number | string;
      metodoPago?: string;
      proveedor?: string;
      folioRelacionado?: Folio | string;
      comprobanteUrl?: string;
      notas?: string;
      sucursalId?: BranchId | string;
    }

    interface GastosListResponse {
      gastos: GastoRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    }

    interface GastoResumenMensualItem {
      mes: string;
      total: MoneyCents | number | string;
      categorias?: Record<string, MoneyCents | number | string>;
    }

    interface GastosResumenResponse {
      resumenMensual?: GastoResumenMensualItem[];
    }

    interface GastoDetailResponse {
      gasto?: GastoRecord;
      error?: string;
    }

    interface GastoGuardadoResponse {
      success?: boolean;
      id?: string | number;
      actualizado?: boolean;
      error?: string;
    }

    interface FinanzasKpis {
      ingresos?: MoneyCents | number | string;
      egresos?: MoneyCents | number | string;
      utilidadBruta?: MoneyCents | number | string;
      ticketPromedio?: MoneyCents | number | string;
      ordenesEntregadas?: number | string;
      cotizacionesConvertidas?: number | string;
      cuentasPorCobrar?: MoneyCents | number | string;
      anticiposPendientes?: MoneyCents | number | string;
    }

    interface FinanzasComparativoMensualItem {
      mes: string;
      ingresos: MoneyCents | number | string;
      egresos: MoneyCents | number | string;
      utilidad: MoneyCents | number | string;
    }

    interface FinanzasResumenCategoriaItem {
      categoria: string;
      total: MoneyCents | number | string;
    }

    interface FinanzasResumenResponse {
      kpis?: FinanzasKpis;
      comparativoMensual?: FinanzasComparativoMensualItem[];
      resumenCategorias?: FinanzasResumenCategoriaItem[];
    }

    interface ReporteOperativoResumen {
      equiposRecibidos?: number | string;
      equiposEntregados?: number | string;
      cotizacionesGeneradas?: number | string;
      promedioDiasEntrega?: number | string;
      stockCritico?: number | string;
      ventasEstimadas?: MoneyCents | number | string;
      gastos?: MoneyCents | number | string;
      ingresos?: MoneyCents | number | string;
      egresos?: MoneyCents | number | string;
      utilidad?: MoneyCents | number | string;
      serviciosFrecuentes?: number | string;
      clientesRecurrentes?: number | string;
    }

    interface ReporteOperativoEquipoRecibido {
      FOLIO?: Folio;
      CLIENTE_NOMBRE?: string;
      DISPOSITIVO?: string;
      MODELO?: string;
    }

    interface ReporteOperativoCotizacion {
      folio?: Folio;
      cliente?: string;
      total?: MoneyCents | number | string;
    }

    interface ReporteOperativoTecnico {
      tecnico?: string;
      total?: number | string;
    }

    interface ReporteOperativoStockCritico {
      SKU?: string;
      NOMBRE?: string;
      STOCK_ACTUAL?: number | string;
      STOCK_MINIMO?: number | string;
    }

    interface ReporteOperativoServicioFrecuente {
      servicio?: string;
      total?: number | string;
    }

    interface ReporteOperativoClienteRecurrente {
      cliente?: string;
      total?: number | string;
    }

    interface ReporteOperativoDetalle {
      equiposRecibidos?: ReporteOperativoEquipoRecibido[];
      cotizaciones?: ReporteOperativoCotizacion[];
      porTecnico?: ReporteOperativoTecnico[];
      stockCritico?: ReporteOperativoStockCritico[];
      serviciosFrecuentes?: ReporteOperativoServicioFrecuente[];
      clientesRecurrentes?: ReporteOperativoClienteRecurrente[];
    }

    interface ReporteOperativoResponse {
      resumen?: ReporteOperativoResumen;
      detalle?: ReporteOperativoDetalle;
    }

    interface SucursalRecord {
      ID?: string;
      NOMBRE: string;
      DIRECCION?: string;
      TELEFONO?: string;
      EMAIL?: string;
      ESTATUS?: 'activo' | 'inactivo' | string;
      ES_MATRIZ?: boolean;
    }

    interface SucursalFormInput {
      id?: string;
      nombre: string;
      direccion?: string;
      telefono?: string;
      email?: string;
      estatus?: 'activo' | 'inactivo' | string;
    }

    interface SucursalesListResponse {
      sucursales: SucursalRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    }

    interface TransferenciaStockRecord {
      ID?: string;
      FECHA?: DateISO | string;
      SKU?: string;
      PRODUCTO?: string;
      SUCURSAL_ORIGEN?: string;
      SUCURSAL_DESTINO?: string;
      CANTIDAD?: number | string;
      USUARIO?: string;
      MOTIVO?: string;
    }

    interface TransferenciasStockResponse {
      transferencias: TransferenciaStockRecord[];
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    }

    interface SecurityActionRecord {
      clave: string;
      titulo: string;
      descripcion?: string;
      accion?: string;
      requiereAdmin?: boolean;
    }

    interface SecurityConfigState {
      mensajeAutorizacion?: string;
      bitacoraActiva?: boolean;
      adminPasswordConfigured?: boolean;
    }

    interface SecurityConfigResponse {
      acciones: SecurityActionRecord[];
      config: SecurityConfigState;
    }

    interface SecurityUserRecord {
      USUARIO: string;
      NOMBRE?: string;
      ROL?: RoleName;
      ACTIVO?: boolean;
      NOTAS?: string;
    }

    interface SecurityUsersResponse {
      usuarios: SecurityUserRecord[];
    }

    interface SecuritySaveConfigResponse {
      acciones: SecurityActionRecord[];
      config: SecurityConfigState;
    }

    interface SecuritySaveUserResponse {
      usuarios: SecurityUserRecord[];
    }

    interface ReceptionChecklist {
      cargador: boolean;
      pantalla: boolean;
      prende: boolean;
      respaldo: boolean;
    }

    interface OperativoDraft {
      folioCotizacion: Folio | '';
      clienteNombre: string;
      clienteTelefono: string;
      clienteEmail: string;
      equipoTipo: string;
      equipoModelo: string;
      equipoFalla: string;
      fechaPromesa: DateISO | '';
      costo: MoneyCents | string | number;
      notasExtra: string;
      checks: ReceptionChecklist;
      fotoAdjunta: boolean;
    }

    interface OperativoOrdenInput {
      sucursalId: BranchId | string;
      clienteNombre: string;
      clienteTelefono: string;
      clienteEmail: string;
      dispositivo: string;
      modelo: string;
      falla: string;
      fechaPromesa: DateISO | '';
      costo: MoneyCents | string | number;
      notas: string;
      checks: ReceptionChecklist;
      fotoRecepcion: string;
      folioSolicitudOrigen: Folio | '';
      adminPasswordActual?: string;
    }

    interface OperativoOrdenRegistrada {
      folio: Folio;
      fecha: string;
      clienteNombre: string;
      clienteTelefono: string;
      clienteEmail: string;
      dispositivo: string;
      modelo: string;
      falla: string;
      fechaPromesa: DateISO | '';
      costo: MoneyCents;
      notas: string;
      fotoRecepcion: string;
      checks: ReceptionChecklist;
    }

    interface OperativoGuardarResponse {
      success: boolean;
      folio: Folio;
      equipo?: Record<string, unknown>;
      error?: string;
      pagoRegistrado?: boolean;
    }

    interface SolicitudLookupResponse {
      solicitud: SolicitudRecord;
      error?: string;
    }

    interface PortalEquipoRecord {
      FOLIO: Folio;
      DISPOSITIVO?: string;
      MODELO?: string;
      FALLA_REPORTADA?: string;
      FECHA_PROMESA?: DateISO | string;
      FECHA_INGRESO?: DateISO | string;
      ESTADO?: string;
      SEGUIMIENTO_CLIENTE?: string;
      SEGUIMIENTO_FOTOS?: string[] | string | null;
      diasRestantes?: number;
      YOUTUBE_ID?: string;
    }

    interface PortalEquipoResponse {
      equipo: PortalEquipoRecord;
      error?: string;
    }

    interface PortalClienteConfig {
      TIENDA_WHATSAPP: string;
      TIENDA_MAPS: string;
      LOGO_URL: string;
      SUGGESTIONS_KEY: string;
    }

    type AllowedModule =
      | 'operativo'
      | 'tecnico'
      | 'solicitudes'
      | 'archivo'
      | 'clientes'
      | 'tareas'
      | 'stock'
      | 'proveedores'
      | 'compras'
      | 'gastos'
      | 'finanzas'
      | 'reportes'
      | 'sucursales'
      | 'seguridad';
  }

  interface Window {
    SRFIX_BACKEND_URL?: string;
    SRFIX_API_URL?: string;
    SRFIX_APP_URL?: string;
    SRFXSecurityGuard?: SrFix.SecurityGuardApi;
    srfixBuildPortalUrl?: (folio: SrFix.Folio) => string;
  }

  function srfixBuildPortalUrl(folio: SrFix.Folio): string;
  function srfixGetPublicAppBaseUrl(): string;
}
