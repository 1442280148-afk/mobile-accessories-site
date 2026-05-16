create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  short_desc text,
  description text,
  image_url text not null,
  status text not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_status_sort_idx
on products (status, sort_order, created_at desc);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

alter table products enable row level security;

drop policy if exists "Public can read published products" on products;
create policy "Public can read published products"
on products for select
using (status = 'published');

drop policy if exists "Public admin can manage products" on products;
create policy "Public admin can manage products"
on products for all
using (true)
with check (true);

drop policy if exists "Public can upload product images" on storage.objects;
create policy "Public can upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images');

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects for select
using (bucket_id = 'product-images');
