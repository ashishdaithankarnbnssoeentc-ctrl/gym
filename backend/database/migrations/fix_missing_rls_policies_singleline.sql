-- Fix missing RLS policies identified by security enforcement CI (single-line format)
-- =========================================

-- USERS table - missing SELECT, INSERT, UPDATE policies
-- =========================================

alter table public.users enable row level security;

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users for select to authenticated using (id = auth.uid() and tenant_id = public.tx_tenant_id());

drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users for insert to authenticated with check (id = auth.uid() and tenant_id = public.tx_tenant_id());

drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users for update to authenticated using (id = auth.uid() and tenant_id = public.tx_tenant_id()) with check (id = auth.uid() and tenant_id = public.tx_tenant_id());

-- =========================================
-- TENANTS table - missing INSERT policy
-- =========================================

drop policy if exists "tenants_insert" on public.tenants;
create policy "tenants_insert" on public.tenants for insert to authenticated with check (id = public.tx_tenant_id() and public.is_admin(auth.uid(), id));

-- =========================================
-- AUDIT_LOGS table - missing UPDATE policy
-- =========================================

drop policy if exists "audit_update" on public.audit_logs;
create policy "audit_update" on public.audit_logs for update to authenticated using (tenant_id = public.tx_tenant_id() and public.is_admin(auth.uid(), tenant_id)) with check (tenant_id = public.tx_tenant_id() and public.is_admin(auth.uid(), tenant_id));

-- =========================================
-- Fix tenant pattern issues
-- =========================================

drop policy if exists "tenants_admin_update" on public.tenants;
create policy "tenants_admin_update" on public.tenants for update to authenticated using (id = public.tx_tenant_id() and public.is_admin(auth.uid(), id)) with check (id = public.tx_tenant_id() and public.is_admin(auth.uid(), id));

drop policy if exists "tenants_admin_delete" on public.tenants;
create policy "tenants_admin_delete" on public.tenants for delete to authenticated using (id = public.tx_tenant_id() and public.is_admin(auth.uid(), id));

-- =========================================
-- Fix kv_store policies - ensure they're properly blocked
-- =========================================

drop policy if exists "kv_store_authenticated_select" on public.kv_store_3ccefd63;
drop policy if exists "kv_store_block_all" on public.kv_store_3ccefd63;
create policy "kv_store_block_all" on public.kv_store_3ccefd63 for all to authenticated using (false) with check (false);

-- =========================================
-- END
-- =========================================
