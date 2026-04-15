-- Servicios Digitales MX
-- Esquema SQL inicial para Supabase Postgres
-- Version inicial

create extension if not exists "pgcrypto";

-- ==========================================
-- Helpers
-- ==========================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ==========================================
-- Core de tenancy
-- ==========================================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active',
  plan text not null default 'starter',
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text,
  address text,
  city text,
  state text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists branches_tenant_code_uidx
  on public.branches (tenant_id, code)
  where code is not null;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  auth_user_id uuid,
  full_name text not null,
  email text not null,
  phone text,
  role text not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists users_tenant_email_uidx
  on public.users (tenant_id, lower(email));

-- ==========================================
-- Clientes
-- ==========================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  tag text default 'nuevo',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_tenant_idx on public.customers (tenant_id);
create index if not exists customers_tenant_phone_idx on public.customers (tenant_id, phone);
create index if not exists customers_tenant_email_idx on public.customers (tenant_id, lower(email));

-- ==========================================
-- Solicitudes / cotizaciones
-- ==========================================

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  folio text not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  device_type text,
  device_model text,
  issue_description text,
  urgency text,
  status text not null default 'pendiente',
  quoted_total numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  solicitud_origen_ip text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists service_requests_tenant_folio_uidx
  on public.service_requests (tenant_id, folio);

-- ==========================================
-- Ordenes de servicio
-- ==========================================

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  folio text not null,
  status text not null default 'recibido',
  priority text default 'normal',
  device_type text,
  device_brand text,
  device_model text,
  serial_number text,
  reported_issue text,
  internal_diagnosis text,
  estimated_cost numeric(12,2) not null default 0,
  final_cost numeric(12,2) not null default 0,
  promised_date date,
  received_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  archived_at timestamptz,
  caso_resolucion_tecnica text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists service_orders_tenant_folio_uidx
  on public.service_orders (tenant_id, folio);

create index if not exists service_orders_tenant_branch_idx
  on public.service_orders (tenant_id, branch_id);

create index if not exists service_orders_tenant_status_idx
  on public.service_orders (tenant_id, status);

create table if not exists public.service_order_checklists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  has_charger boolean not null default false,
  screen_condition text,
  powers_on boolean not null default false,
  backup_required boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists service_order_checklists_order_uidx
  on public.service_order_checklists (service_order_id);

create table if not exists public.service_order_status_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  previous_status text,
  new_status text not null,
  comment text,
  changed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists service_order_status_history_order_idx
  on public.service_order_status_history (service_order_id, created_at desc);

-- ==========================================
-- Tareas
-- ==========================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'pendiente',
  priority text not null default 'media',
  assigned_user_id uuid references public.users(id) on delete set null,
  due_date timestamptz,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tasks_tenant_branch_idx on public.tasks (tenant_id, branch_id);
create index if not exists tasks_tenant_status_idx on public.tasks (tenant_id, status);
create index if not exists tasks_assigned_idx on public.tasks (assigned_user_id);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type text not null,
  comment text,
  changed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ==========================================
-- Proveedores e inventario
-- ==========================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  business_name text not null,
  legal_name text,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  categories text,
  lead_time_days integer,
  payment_terms text,
  price_score integer default 0,
  speed_score integer default 0,
  quality_score integer default 0,
  reliability_score integer default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists suppliers_tenant_idx on public.suppliers (tenant_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  name text not null,
  category text,
  brand text,
  compatible_model text,
  primary_supplier_id uuid references public.suppliers(id) on delete set null,
  cost numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  minimum_stock numeric(12,2) not null default 0,
  unit text,
  location text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists products_tenant_sku_uidx
  on public.products (tenant_id, sku);

create table if not exists public.branch_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  stock_current numeric(12,2) not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists branch_inventory_uidx
  on public.branch_inventory (tenant_id, branch_id, product_id);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  related_service_order_id uuid references public.service_orders(id) on delete set null,
  folio text not null,
  status text not null default 'borrador',
  reference text,
  payment_terms text,
  expected_date date,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists purchase_orders_tenant_folio_uidx
  on public.purchase_orders (tenant_id, folio);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku_snapshot text,
  product_name_snapshot text,
  qty_ordered numeric(12,2) not null default 0,
  qty_received numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  movement_type text not null,
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  reference text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists inventory_movements_tenant_product_idx
  on public.inventory_movements (tenant_id, product_id, created_at desc);

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  severity text not null,
  acknowledged_by uuid references public.users(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- ==========================================
-- Gastos y pagos
-- ==========================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  expense_type text not null,
  category text not null,
  concept text not null,
  description text,
  amount numeric(12,2) not null default 0,
  payment_method text,
  receipt_url text,
  notes text,
  expense_date date not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists expenses_tenant_date_idx
  on public.expenses (tenant_id, expense_date desc);

create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  payment_type text,
  amount numeric(12,2) not null default 0,
  payment_method text,
  reference text,
  notes text,
  paid_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ==========================================
-- Archivos y notificaciones
-- ==========================================

create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  file_type text not null,
  bucket_name text not null,
  storage_path text not null,
  public_url text,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel text not null,
  event_type text not null,
  recipient text not null,
  payload_json jsonb,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

-- ==========================================
-- Triggers updated_at
-- ==========================================

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists trg_branches_updated_at on public.branches;
create trigger trg_branches_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_requests_updated_at on public.service_requests;
create trigger trg_service_requests_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_orders_updated_at on public.service_orders;
create trigger trg_service_orders_updated_at
before update on public.service_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_order_checklists_updated_at on public.service_order_checklists;
create trigger trg_service_order_checklists_updated_at
before update on public.service_order_checklists
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_inventory_updated_at on public.branch_inventory;
create trigger trg_branch_inventory_updated_at
before update on public.branch_inventory
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_order_items_updated_at on public.purchase_order_items;
create trigger trg_purchase_order_items_updated_at
before update on public.purchase_order_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();
