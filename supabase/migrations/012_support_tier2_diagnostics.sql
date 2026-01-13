-- ============================================
-- SUPPORT TIER-2 DIAGNOSTICS UTILITIES
-- ============================================

create or replace function public.support_supabase_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := jsonb_build_object();
begin
  result := result || jsonb_build_object(
    'orphan_profiles',
    coalesce((
      select jsonb_agg(row_to_json(q))
      from (
        select
          p.id,
          p.email,
          p.full_name,
          p.subscription_tier,
          p.subscription_status,
          p.updated_at
        from public.profiles p
        left join auth.users u on u.id = p.id
        where u.id is null
        order by p.updated_at desc
        limit 10
      ) q
    ), '[]'::jsonb)
  );

  result := result || jsonb_build_object(
    'inactive_subscriptions',
    coalesce((
      select jsonb_agg(row_to_json(q))
      from (
        select
          s.id,
          s.user_id,
          s.status,
          s.tier,
          s.current_period_end,
          s.updated_at
        from public.subscriptions s
        where s.status in ('past_due', 'incomplete', 'incomplete_expired')
        order by s.updated_at desc
        limit 10
      ) q
    ), '[]'::jsonb)
  );

  result := result || jsonb_build_object(
    'recent_audit_errors',
    coalesce((
      select jsonb_agg(row_to_json(q))
      from (
        select
          l.id,
          l.event_type,
          l.user_id,
          l.severity,
          l.metadata,
          l.created_at
        from public.app_audit_log l
        where l.severity = 'error'
        order by l.created_at desc
        limit 10
      ) q
    ), '[]'::jsonb)
  );

  result := result || jsonb_build_object(
    'recent_workflow_errors',
    coalesce((
      select jsonb_agg(row_to_json(q))
      from (
        select
          w.id,
          w.workflow_name,
          w.span_name,
          w.metadata,
          w.created_at
        from public.log_workflow_events w
        where w.status = 'error'
        order by w.created_at desc
        limit 10
      ) q
    ), '[]'::jsonb)
  );

  return result || jsonb_build_object('generated_at', now());
end;
$$;

grant execute on function public.support_supabase_diagnostics() to service_role;




