
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null default 1,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (date, start_time)
);
create index slots_date_idx on public.slots(date);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  slot_id uuid references public.slots(id) on delete cascade not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_user_idx on public.bookings(user_id);
create index bookings_slot_idx on public.bookings(slot_id);
-- Prevent a user from confirming the same slot twice
create unique index bookings_unique_confirmed
  on public.bookings(user_id, slot_id) where status = 'confirmed';

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.slots enable row level security;
alter table public.bookings enable row level security;

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Trigger: auto profile + default user role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger for bookings
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Policies: profiles
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id);

-- Policies: user_roles (read own + admins read all; only admins write)
create policy "roles_select_own_or_admin" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles_admin_write" on public.user_roles for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Policies: slots (any authenticated can read; admin writes)
create policy "slots_select_auth" on public.slots for select to authenticated using (true);
create policy "slots_admin_write" on public.slots for all
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Policies: bookings
create policy "bookings_select_own_or_admin" on public.bookings for select
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "bookings_insert_own" on public.bookings for insert
  with check (auth.uid() = user_id);
create policy "bookings_update_own_or_admin" on public.bookings for update
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "bookings_delete_own_or_admin" on public.bookings for delete
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- Atomic booking RPC: prevents conflicts via row lock + capacity check
create or replace function public.book_slot(_slot_id uuid, _notes text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slots;
  v_count int;
  v_booking public.bookings;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_slot from public.slots where id = _slot_id for update;
  if not found then raise exception 'Slot not found'; end if;
  if v_slot.is_disabled then raise exception 'Slot disabled'; end if;
  if (v_slot.date + v_slot.start_time) < now() then raise exception 'Slot in the past'; end if;

  select count(*) into v_count from public.bookings
    where slot_id = _slot_id and status = 'confirmed';
  if v_count >= v_slot.capacity then
    raise exception 'This slot is no longer available' using errcode = 'P0001';
  end if;

  insert into public.bookings (user_id, slot_id, status, notes)
  values (v_uid, _slot_id, 'confirmed', _notes)
  returning * into v_booking;
  return v_booking;
end;
$$;

grant execute on function public.book_slot(uuid, text) to authenticated;
