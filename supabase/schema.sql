create extension if not exists pgcrypto;

create table if not exists public.messers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  invoice_date text not null,
  messers text not null,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_no integer not null,
  product text not null default '',
  grams text not null default '',
  qty integer not null default 0,
  f1 boolean not null default false,
  f2 boolean not null default false,
  f3 boolean not null default false,
  f4 boolean not null default false,
  b boolean not null default false,
  d boolean not null default false,
  s1 boolean not null default false,
  s2 boolean not null default false,
  rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  amount_override boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.production_records (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  batch_no text not null default '',
  quantity integer not null default 0,
  grams integer not null default 0,
  record_date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.messers (name)
values ('PHOENIX MEDICAMENTS PVT. LTD.')
on conflict (name) do nothing;

alter table public.messers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.production_records enable row level security;

drop policy if exists "open access messers" on public.messers;
create policy "open access messers" on public.messers
for all using (true) with check (true);

drop policy if exists "open access products" on public.products;
create policy "open access products" on public.products
for all using (true) with check (true);

drop policy if exists "open access invoices" on public.invoices;
create policy "open access invoices" on public.invoices
for all using (true) with check (true);

drop policy if exists "open access invoice_items" on public.invoice_items;
create policy "open access invoice_items" on public.invoice_items
for all using (true) with check (true);

drop policy if exists "open access production_records" on public.production_records;
create policy "open access production_records" on public.production_records
for all using (true) with check (true);
