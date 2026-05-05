-- Audit Log Trigger and Schema
-- Creates comprehensive audit logging for all tenant-isolated tables

-- Create audit_logs table if it doesn't exist
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_row jsonb,
  new_row jsonb,
  user_id text,
  user_email text,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now(),
  
  -- Ensure tenant isolation for audit logs themselves
  constraint audit_logs_tenant_check check (tenant_id is not null and tenant_id <> '')
);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- Create policy for audit_logs - users can only see their own tenant's audit logs
create policy "Users can view their tenant audit logs" on public.audit_logs
  for select using (tenant_id = current_setting('app.tenant_id', true));

-- Admin policy for audit logs
create policy "Admins can view their tenant audit logs" on public.audit_logs
  for all using (tenant_id = current_setting('app.tenant_id', true));

-- Create audit trigger function
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_tenant text;
  current_user_id text;
  current_user_email text;
  current_ip inet;
  current_ua text;
begin
  -- Get current tenant context
  current_tenant := current_setting('app.tenant_id', true);
  
  -- Get user context from session variables
  current_user_id := current_setting('app.user_id', true);
  current_user_email := current_setting('app.user_email', true);
  current_ip := current_setting('app.ip_address', true)::inet;
  current_ua := current_setting('app.user_agent', true);
  
  -- Ensure we have tenant context
  if current_tenant is null or current_tenant = '' then
    raise exception 'Audit trigger: No tenant context set';
  end if;
  
  -- Insert audit record
  insert into public.audit_logs (
    tenant_id,
    table_name,
    operation,
    old_row,
    new_row,
    user_id,
    user_email,
    ip_address,
    user_agent
  ) values (
    current_tenant,
    tg_table_name,
    tg_op,
    case 
      when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old)
      else null
    end,
    case 
      when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new)
      else null
    end,
    current_user_id,
    current_user_email,
    current_ip,
    current_ua
  );
  
  return coalesce(new, old);
end;
$$;

-- Helper function to attach audit triggers to tenant-isolated tables
create or replace function public.enable_audit_logging(table_name text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('
    drop trigger if exists audit_%I on public.%I;
    create trigger audit_%I
    after insert or update or delete
    on public.%I
    for each row execute function public.audit_trigger();
  ', table_name, table_name, table_name, table_name);
end;
$$;

-- Helper function to disable audit logging for a table
create or replace function public.disable_audit_logging(table_name text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
end;
$$;

-- Function to get tables that should have audit logging (tables with tenant_id)
create or replace function public.get_tenant_tables()
returns table(table_name text)
language plpgsql
security definer
as $$
begin
  return query
  select t.table_name
  from information_schema.tables t
  join information_schema.columns c on c.table_name = t.table_name and c.table_schema = t.table_schema
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and c.column_name = 'tenant_id'
    and t.table_name not in ('audit_logs', 'schema_migrations')
    and t.table_name not like 'pg_%'
  group by t.table_name;
end;
$$;

-- Function to enable audit logging on all tenant tables
create or replace function public.enable_audit_logging_all()
returns void
language plpgsql
security definer
as $$
declare
  table_record record;
begin
  for table_record in select * from public.get_tenant_tables() loop
    perform public.enable_audit_logging(table_record.table_name);
    raise notice 'Audit logging enabled for table: %', table_record.table_name;
  end loop;
end;
$$;

-- Create indexes for better audit log performance
create index if not exists idx_audit_logs_tenant_id on public.audit_logs(tenant_id);
create index if not exists idx_audit_logs_table_name on public.audit_logs(table_name);
create index if not exists idx_audit_logs_operation on public.audit_logs(operation);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant select on public.audit_logs to authenticated;
grant execute on function public.enable_audit_logging(text) to authenticated;
grant execute on function public.disable_audit_logging(text) to authenticated;
grant execute on function public.enable_audit_logging_all() to authenticated;
grant execute on function public.get_tenant_tables() to authenticated;

-- Row Level Security for audit functions
alter function public.enable_audit_logging(text) security definer;
alter function public.disable_audit_logging(text) security definer;
alter function public.enable_audit_logging_all() security definer;
alter function public.get_tenant_tables() security definer;
