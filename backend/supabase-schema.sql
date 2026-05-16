create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  short_desc text,
  description text,
  image_url text not null,
  price text,
  moq text,
  material text,
  packaging text,
  lead_time text,
  features text,
  product_video text,
  status text not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table products add column if not exists price text;
alter table products add column if not exists moq text;
alter table products add column if not exists material text;
alter table products add column if not exists packaging text;
alter table products add column if not exists lead_time text;
alter table products add column if not exists features text;
alter table products add column if not exists product_video text;

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

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_sort_idx
on product_images (product_id, sort_order, created_at);

alter table product_images enable row level security;

drop policy if exists "Public can read product images table" on product_images;
create policy "Public can read product images table"
on product_images for select
using (true);

drop policy if exists "Public admin can manage product images table" on product_images;
create policy "Public admin can manage product images table"
on product_images for all
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

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  whatsapp text,
  product text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table inquiries add column if not exists status text not null default 'new';
alter table inquiries alter column status set default 'new';
update inquiries set status = lower(status) where status is not null;

alter table inquiries enable row level security;

drop policy if exists "Public can submit inquiries" on inquiries;
create policy "Public can submit inquiries"
on inquiries for insert
with check (true);

drop policy if exists "Public admin can manage inquiries" on inquiries;
create policy "Public admin can manage inquiries"
on inquiries for all
using (true)
with check (true);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  description text,
  link text,
  sort_order integer not null default 0,
  status text not null default 'published',
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

drop policy if exists "Public can read published categories" on categories;
create policy "Public can read published categories"
on categories for select
using (status = 'published');

drop policy if exists "Public admin can manage categories" on categories;
create policy "Public admin can manage categories"
on categories for all
using (true)
with check (true);

create table if not exists factory_media (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  video_url text not null,
  status text not null default 'published',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table factory_media enable row level security;

drop policy if exists "Public can read published factory media" on factory_media;
create policy "Public can read published factory media"
on factory_media for select
using (status = 'published');

drop policy if exists "Public admin can manage factory media" on factory_media;
create policy "Public admin can manage factory media"
on factory_media for all
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('factory-videos', 'factory-videos', true)
on conflict (id) do nothing;

drop policy if exists "Public can upload factory videos" on storage.objects;
create policy "Public can upload factory videos"
on storage.objects for insert
with check (bucket_id = 'factory-videos');

drop policy if exists "Public can read factory videos" on storage.objects;
create policy "Public can read factory videos"
on storage.objects for select
using (bucket_id = 'factory-videos');
