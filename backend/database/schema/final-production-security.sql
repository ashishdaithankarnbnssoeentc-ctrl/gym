-- =========================================
-- Tenant context (server-controlled)
-- =========================================

create or replace function public.tx_tenant_id()
returns uuid
language plpgsql
stable
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := nullif(current_setting('app.tenant_id', true), '')::uuid;

  if v_tenant_id is null then
    raise exception 'Missing app.tenant_id in transaction context';
  end if;

  return v_tenant_id;
end;
$$;

-- =========================================
-- Admin check (DB-verified)
-- =========================================

create or replace function public.is_admin(p_user_id uuid, p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_user_id
      and m.tenant_id = p_tenant_id
      and m.status = 'admin'
  );
$$;

-- =========================================
-- MEMBERSHIPS (critical table)
-- =========================================

alter table public.memberships enable row level security;

drop policy if exists "memberships_select" on public.memberships;
create policy "memberships_select"
on public.memberships
for select
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and user_id = auth.uid()
);

drop policy if exists "memberships_insert_admin_only" on public.memberships;
create policy "memberships_insert_admin_only"
on public.memberships
for insert
to authenticated
with check (
  public.is_admin(auth.uid(), tenant_id)
  and tenant_id = public.tx_tenant_id()
);

drop policy if exists "memberships_update_admin_only" on public.memberships;
create policy "memberships_update_admin_only"
on public.memberships
for update
to authenticated
using (
  public.is_admin(auth.uid(), tenant_id)
  and tenant_id = public.tx_tenant_id()
)
with check (
  public.is_admin(auth.uid(), tenant_id)
  and tenant_id = public.tx_tenant_id()
);

drop policy if exists "memberships_delete_admin_only" on public.memberships;
create policy "memberships_delete_admin_only"
on public.memberships
for delete
to authenticated
using (
  public.is_admin(auth.uid(), tenant_id)
  and tenant_id = public.tx_tenant_id()
);

-- =========================================
-- TENANTS
-- =========================================

alter table public.tenants enable row level security;

drop policy if exists "tenants_select" on public.tenants;
create policy "tenants_select"
on public.tenants
for select
to authenticated
using (
  id = public.tx_tenant_id()
);

drop policy if exists "tenants_admin_update" on public.tenants;
create policy "tenants_admin_update"
on public.tenants
for update
to authenticated
using (
  public.is_admin(auth.uid(), id)
)
with check (
  public.is_admin(auth.uid(), id)
);

drop policy if exists "tenants_admin_delete" on public.tenants;
create policy "tenants_admin_delete"
on public.tenants
for delete
to authenticated
using (
  public.is_admin(auth.uid(), id)
);

-- =========================================
-- CONTENT (tenant-scoped)
-- =========================================

alter table public.content enable row level security;

drop policy if exists "content_select" on public.content;
create policy "content_select"
on public.content
for select
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = content.tenant_id
  )
);

drop policy if exists "content_insert_admin" on public.content;
create policy "content_insert_admin"
on public.content
for insert
to authenticated
with check (
  tenant_id = public.tx_tenant_id()
  and public.is_admin(auth.uid(), tenant_id)
);

drop policy if exists "content_update_admin" on public.content;
create policy "content_update_admin"
on public.content
for update
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and public.is_admin(auth.uid(), tenant_id)
)
with check (
  tenant_id = public.tx_tenant_id()
  and public.is_admin(auth.uid(), tenant_id)
);

drop policy if exists "content_delete_admin" on public.content;
create policy "content_delete_admin"
on public.content
for delete
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and public.is_admin(auth.uid(), tenant_id)
);

-- =========================================
-- FAVORITES (user + tenant scoped)
-- =========================================

alter table public.favorites enable row level security;

drop policy if exists "favorites_select" on public.favorites;
create policy "favorites_select"
on public.favorites
for select
to authenticated
using (
  user_id = auth.uid()
  and tenant_id = public.tx_tenant_id()
  and exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = favorites.tenant_id
  )
);

drop policy if exists "favorites_insert" on public.favorites;
create policy "favorites_insert"
on public.favorites
for insert
to authenticated
with check (
  user_id = auth.uid()
  and tenant_id = public.tx_tenant_id()
  and exists (
    select 1
    from public.content c
    where c.id = favorites.content_id
      and c.tenant_id = favorites.tenant_id
  )
);

drop policy if exists "favorites_delete" on public.favorites;
create policy "favorites_delete"
on public.favorites
for delete
to authenticated
using (
  user_id = auth.uid()
  and tenant_id = public.tx_tenant_id()
);

-- =========================================
-- AUDIT LOGS
-- =========================================

alter table public.audit_logs enable row level security;

drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select"
on public.audit_logs
for select
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = audit_logs.tenant_id
  )
);

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert"
on public.audit_logs
for insert
to authenticated
with check (
  tenant_id = public.tx_tenant_id()
);

-- =========================================
-- MEMBERSHIP NOTIFICATIONS
-- =========================================

alter table public.membership_notifications enable row level security;

drop policy if exists "notifications_all" on public.membership_notifications;
create policy "notifications_all"
on public.membership_notifications
for all
to authenticated
using (
  tenant_id = public.tx_tenant_id()
  and exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = membership_notifications.tenant_id
  )
)
with check (
  tenant_id = public.tx_tenant_id()
);

-- =========================================
-- KV STORE (locked down)
-- =========================================

alter table public.kv_store_3ccefd63 enable row level security;

drop policy if exists "kv_store_block_all" on public.kv_store_3ccefd63;
create policy "kv_store_block_all"
on public.kv_store_3ccefd63
for all
to authenticated
using (false)
with check (false);

-- =========================================
-- END
-- =========================================
