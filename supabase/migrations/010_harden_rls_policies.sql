-- ─── Migration 010: Production RLS hardening (safe for partial schemas) ───
-- This version skips tables that do not exist yet in the target Supabase
-- project, so it can be pasted directly into the SQL editor without failing.

-- ── Enable + force RLS and clear default grants on user-owned tables ───────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY[
    'profiles', 'resources', 'notes', 'progress', 'activity_log', 'mistakes',
    'chat_history', 'questions_answered', 'xp_logs', 'streak_logs',
    'conversations', 'topic_mastery', 'tasks', 'daily_plans',
    'jarvis_memory', 'jarvis_sessions'
  ] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('alter table public.%I force row level security', tbl);
      execute format('revoke all on table public.%I from anon, authenticated', tbl);
    end if;
  end loop;
end $$;

-- ── Authenticated users: writable tables ────────────────────────────────────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY[
    'profiles', 'resources', 'notes', 'chat_history', 'conversations',
    'tasks', 'daily_plans', 'jarvis_memory', 'jarvis_sessions'
  ] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to authenticated',
        tbl
      );
    end if;
  end loop;
end $$;

-- ── Authenticated users: read-only tables ───────────────────────────────────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY[
    'progress', 'activity_log', 'mistakes', 'questions_answered',
    'xp_logs', 'streak_logs', 'topic_mastery'
  ] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('grant select on table public.%I to authenticated', tbl);
    end if;
  end loop;
end $$;

-- ── Service-role-only operational tables ────────────────────────────────────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY['admin_audit_log', 'processed_webhooks'] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', tbl);
      execute format('grant all on table public.%I to service_role', tbl);
    end if;
  end loop;
end $$;

-- ── profiles: 1:1 with auth.users via id = auth.uid() ───────────────────────
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "profiles_select_own" on public.profiles';
    execute 'drop policy if exists "profiles_insert_own" on public.profiles';
    execute 'drop policy if exists "profiles_update_own" on public.profiles';
    execute 'drop policy if exists "profiles_delete_own" on public.profiles';

    execute 'create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid())';
    execute 'create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid())';
    execute 'create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())';
    execute 'create policy "profiles_delete_own" on public.profiles for delete to authenticated using (id = auth.uid())';
  end if;
end $$;

-- ── resources: own uploads + shared global resources ────────────────────────
do $$
begin
  if to_regclass('public.resources') is not null then
    execute 'drop policy if exists "resources_select" on public.resources';
    execute 'drop policy if exists "resources_insert_own" on public.resources';
    execute 'drop policy if exists "resources_update_own" on public.resources';
    execute 'drop policy if exists "resources_delete_own" on public.resources';
    execute 'drop policy if exists "resources_select_own_or_global" on public.resources';

    execute 'create policy "resources_select_own_or_global" on public.resources for select to authenticated using (user_id = auth.uid() or coalesce(is_global, false) = true)';
    execute 'create policy "resources_insert_own" on public.resources for insert to authenticated with check (user_id = auth.uid() and coalesce(is_global, false) = false)';
    execute 'create policy "resources_update_own" on public.resources for update to authenticated using (user_id = auth.uid() and coalesce(is_global, false) = false) with check (user_id = auth.uid() and coalesce(is_global, false) = false)';
    execute 'create policy "resources_delete_own" on public.resources for delete to authenticated using (user_id = auth.uid() and coalesce(is_global, false) = false)';
  end if;
end $$;

-- ── user-editable tables: full CRUD on own rows ─────────────────────────────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY['notes', 'chat_history', 'conversations', 'tasks', 'daily_plans', 'jarvis_memory'] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      if tbl = 'tasks' then
        execute 'drop policy if exists "Users can manage own tasks" on public.tasks';
      end if;
      if tbl = 'conversations' then
        execute 'drop policy if exists "conv_select_own" on public.conversations';
        execute 'drop policy if exists "conv_insert_own" on public.conversations';
        execute 'drop policy if exists "conv_update_own" on public.conversations';
      end if;

      execute format('drop policy if exists %I on public.%I', tbl || '_own', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);

      execute format(
        'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
        tbl || '_select_own',
        tbl
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
        tbl || '_insert_own',
        tbl
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
        tbl || '_update_own',
        tbl
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
        tbl || '_delete_own',
        tbl
      );
    end if;
  end loop;
end $$;

-- ── jarvis_sessions: own read/insert/delete only ────────────────────────────
do $$
begin
  if to_regclass('public.jarvis_sessions') is not null then
    execute 'drop policy if exists "Users can read own Jarvis sessions" on public.jarvis_sessions';
    execute 'drop policy if exists "Users can insert own Jarvis sessions" on public.jarvis_sessions';
    execute 'drop policy if exists "Users can delete own Jarvis sessions" on public.jarvis_sessions';
    execute 'drop policy if exists "jarvis_sessions_select_own" on public.jarvis_sessions';
    execute 'drop policy if exists "jarvis_sessions_insert_own" on public.jarvis_sessions';
    execute 'drop policy if exists "jarvis_sessions_delete_own" on public.jarvis_sessions';

    execute 'create policy "jarvis_sessions_select_own" on public.jarvis_sessions for select to authenticated using (user_id = auth.uid())';
    execute 'create policy "jarvis_sessions_insert_own" on public.jarvis_sessions for insert to authenticated with check (user_id = auth.uid())';
    execute 'create policy "jarvis_sessions_delete_own" on public.jarvis_sessions for delete to authenticated using (user_id = auth.uid())';
  end if;
end $$;

-- ── system-managed analytics / learning tables: read own only ───────────────
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY['progress', 'activity_log', 'mistakes', 'questions_answered', 'xp_logs', 'streak_logs', 'topic_mastery'] loop
    if to_regclass(format('public.%I', tbl)) is not null then
      if tbl = 'questions_answered' then
        execute 'drop policy if exists "qa_select_own" on public.questions_answered';
      elsif tbl = 'xp_logs' then
        execute 'drop policy if exists "xp_select_own" on public.xp_logs';
      elsif tbl = 'streak_logs' then
        execute 'drop policy if exists "sl_select_own" on public.streak_logs';
      elsif tbl = 'topic_mastery' then
        execute 'drop policy if exists "tm_select_own" on public.topic_mastery';
      end if;

      execute format('drop policy if exists %I on public.%I', tbl || '_own', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);

      execute format(
        'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
        tbl || '_select_own',
        tbl
      );
    end if;
  end loop;
end $$;
