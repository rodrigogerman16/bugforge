-- Row Level Security for the Supabase/PostgreSQL target schema (item 50).
--
-- How this relates to the app's own authorization (lib/permissions.ts,
-- item 48): Next.js talks to this database through Prisma using a direct
-- Postgres connection, which in Supabase's own setup is the `postgres`
-- role (or a role with BYPASSRLS) — RLS does not apply to that connection,
-- by design, the same way it doesn't apply to any admin/superuser
-- connection in Postgres. The application-layer checks in
-- lib/permissions.ts remain the primary authorization boundary for
-- requests that go through the Next.js app.
--
-- What RLS adds here is a second, independent layer that's enforced by
-- Postgres itself for every OTHER way this database could be reached:
-- the Supabase client library used directly (e.g. a future mobile app),
-- the auto-generated PostgREST API Supabase exposes over every table,
-- the Supabase Studio SQL/table editor for a teammate with project
-- access but no reason to see every game, or a bug in the Next.js code
-- that forgets to call an assertCan*() guard. None of those paths route
-- through lib/permissions.ts, so without RLS they would see and change
-- everything.
--
-- Two rules can't be expressed as a plain row policy (Postgres policies
-- see the whole NEW row, not which specific column changed) and are
-- implemented as triggers instead, directly mirroring the equivalent
-- application-layer rule:
--   - a Developer can move a bug to In Progress or Fixed, but not touch
--     any other status (see DEVELOPER_ALLOWED_STATUSES in
--     lib/permissions.ts)
--   - only an Admin can change a user's role (see assertCanManageRoles)

-- ── Helper functions ────────────────────────────────────────────────────

-- Resolves the calling Supabase Auth session (auth.uid()) to this app's
-- own users.id — the same lookup getCurrentUser() does in the live app,
-- moved into the database so every policy below can reuse it.
create or replace function app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_user_id = auth.uid()
$$;

create or replace function app_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where auth_user_id = auth.uid()
$$;

-- A user can access a game if: they're an Admin, the game predates
-- organization-scoping (organization_id is null — every game in the app
-- today), or they have an explicit game_members row for it. This is the
-- literal "users should only access games they're authorized to access"
-- requirement, expressed once and reused by every game-scoped table
-- below instead of repeating the same three conditions per policy.
create or replace function can_access_game(target_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_user_role() = 'ADMIN'
    or exists (
      select 1 from public.games g
      where g.id = target_game_id and g.organization_id is null
    )
    or exists (
      select 1 from public.game_members gm
      where gm.game_id = target_game_id and gm.user_id = app_user_id()
    )
$$;

-- ── Triggers for rules a row policy can't express ───────────────────────

create or replace function enforce_developer_bug_status()
returns trigger
language plpgsql
as $$
begin
  if app_user_role() = 'DEVELOPER' and new.status is distinct from old.status then
    if new.status not in ('IN_PROGRESS', 'FIXED') then
      raise exception 'Developers can only move a bug to In Progress or Fixed.';
    end if;
  end if;
  return new;
end;
$$;

create trigger bugs_developer_status_guard
  before update on public.bugs
  for each row execute function enforce_developer_bug_status();

create or replace function enforce_role_change_admin_only()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and app_user_role() <> 'ADMIN' then
    raise exception 'Only Admins can change a teammate''s role.';
  end if;
  return new;
end;
$$;

create trigger users_role_change_guard
  before update on public.users
  for each row execute function enforce_role_change_admin_only();

-- ── users / organizations / game_members ────────────────────────────────

alter table public.users enable row level security;

create policy users_select on public.users
  for select using (true); -- team directory — every signed-in user can see every user, matching the live app's Testers page

create policy users_update_self_or_admin on public.users
  for update using (id = app_user_id() or app_user_role() = 'ADMIN')
  with check (id = app_user_id() or app_user_role() = 'ADMIN');

create policy users_insert_admin on public.users
  for insert with check (app_user_role() = 'ADMIN');

create policy users_delete_admin on public.users
  for delete using (app_user_role() = 'ADMIN');

alter table public.organizations enable row level security;

create policy organizations_select on public.organizations
  for select using (
    app_user_role() = 'ADMIN'
    or exists (
      select 1 from public.games g join public.game_members gm on gm.game_id = g.id
      where g.organization_id = organizations.id and gm.user_id = app_user_id()
    )
  );

create policy organizations_write_admin on public.organizations
  for all using (app_user_role() = 'ADMIN') with check (app_user_role() = 'ADMIN');

alter table public.game_members enable row level security;

create policy game_members_select on public.game_members
  for select using (user_id = app_user_id() or app_user_role() in ('ADMIN', 'QA_LEAD'));

create policy game_members_write on public.game_members
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD'))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD'));

-- ── platforms / games / game_platforms / game_areas ─────────────────────

alter table public.platforms enable row level security;

create policy platforms_select on public.platforms
  for select using (true); -- a fixed system lookup, not a secret

create policy platforms_write_admin on public.platforms
  for all using (app_user_role() = 'ADMIN') with check (app_user_role() = 'ADMIN');

alter table public.games enable row level security;

create policy games_select on public.games
  for select using (can_access_game(id));

create policy games_insert on public.games
  for insert with check (app_user_role() in ('ADMIN', 'QA_LEAD'));

create policy games_update on public.games
  for update using (app_user_role() in ('ADMIN', 'QA_LEAD'))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD'));

create policy games_delete on public.games
  for delete using (app_user_role() = 'ADMIN');

alter table public.game_platforms enable row level security;

create policy game_platforms_select on public.game_platforms
  for select using (can_access_game(game_id));

create policy game_platforms_write on public.game_platforms
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id));

alter table public.game_areas enable row level security;

create policy game_areas_select on public.game_areas
  for select using (can_access_game(game_id));

create policy game_areas_write on public.game_areas
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id));

-- ── builds / test_sessions / test_session_members ───────────────────────

alter table public.builds enable row level security;

create policy builds_select on public.builds
  for select using (can_access_game(game_id));

create policy builds_write on public.builds
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id));

alter table public.test_sessions enable row level security;

create policy test_sessions_select on public.test_sessions
  for select using (can_access_game(game_id));

create policy test_sessions_write on public.test_sessions
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id));

alter table public.test_session_members enable row level security;

create policy test_session_members_select on public.test_session_members
  for select using (
    user_id = app_user_id()
    or exists (
      select 1 from public.test_sessions ts
      where ts.id = test_session_members.test_session_id and can_access_game(ts.game_id)
    )
  );

create policy test_session_members_write on public.test_session_members
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD'))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD'));

-- ── tags / bug_tags ──────────────────────────────────────────────────────

alter table public.tags enable row level security;

create policy tags_select on public.tags
  for select using (true);

create policy tags_write on public.tags
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD'))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD'));

alter table public.bug_tags enable row level security;

create policy bug_tags_select on public.bug_tags
  for select using (
    exists (select 1 from public.bugs b where b.id = bug_tags.bug_id and can_access_game(b.game_id))
  );

create policy bug_tags_write on public.bug_tags
  for all using (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and exists (select 1 from public.bugs b where b.id = bug_tags.bug_id and can_access_game(b.game_id))
  )
  with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and exists (select 1 from public.bugs b where b.id = bug_tags.bug_id and can_access_game(b.game_id))
  );

-- ── bugs / bug_relationships ─────────────────────────────────────────────

alter table public.bugs enable row level security;

create policy bugs_select on public.bugs
  for select using (can_access_game(game_id));

-- CREATE_BUG: Admin, QA Lead, QA Tester (see lib/permissions.ts)
create policy bugs_insert on public.bugs
  for insert with check (app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER') and can_access_game(game_id));

-- EDIT_BUG_FIELDS + CHANGE_BUG_STATUS, coarsely: Admin/QA Lead edit any
-- bug; a QA Tester only their own; a Developer only a bug they're already
-- allowed to see (the bugs_developer_status_guard trigger above then
-- narrows *which* status values a Developer may actually set).
create policy bugs_update on public.bugs
  for update using (
    can_access_game(game_id)
    and (
      app_user_role() in ('ADMIN', 'QA_LEAD', 'DEVELOPER')
      or (app_user_role() = 'QA_TESTER' and reported_by_id = app_user_id())
    )
  )
  with check (
    can_access_game(game_id)
    and (
      app_user_role() in ('ADMIN', 'QA_LEAD', 'DEVELOPER')
      or (app_user_role() = 'QA_TESTER' and reported_by_id = app_user_id())
    )
  );

-- BULK_BUG_ACTIONS: Admin, QA Lead only
create policy bugs_delete on public.bugs
  for delete using (app_user_role() in ('ADMIN', 'QA_LEAD'));

alter table public.bug_relationships enable row level security;

create policy bug_relationships_select on public.bug_relationships
  for select using (
    exists (select 1 from public.bugs b where b.id = bug_relationships.source_bug_id and can_access_game(b.game_id))
  );

create policy bug_relationships_write on public.bug_relationships
  for all using (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and exists (select 1 from public.bugs b where b.id = bug_relationships.source_bug_id and can_access_game(b.game_id))
  )
  with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and exists (select 1 from public.bugs b where b.id = bug_relationships.source_bug_id and can_access_game(b.game_id))
  );

-- ── bug_comments / bug_comment_reactions / bug_attachments / bug_history ─

alter table public.bug_comments enable row level security;

create policy bug_comments_select on public.bug_comments
  for select using (
    exists (select 1 from public.bugs b where b.id = bug_comments.bug_id and can_access_game(b.game_id))
  );

-- COMMENT: Admin, QA Lead, QA Tester, Developer (see lib/permissions.ts) —
-- Producer and Viewer are excluded, matching the app's capability matrix.
create policy bug_comments_insert on public.bug_comments
  for insert with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER', 'DEVELOPER')
    and author_id = app_user_id()
    and exists (select 1 from public.bugs b where b.id = bug_comments.bug_id and can_access_game(b.game_id))
  );

-- Only the comment's own author may edit/delete it (Admin excepted).
create policy bug_comments_update on public.bug_comments
  for update using (author_id = app_user_id() or app_user_role() = 'ADMIN')
  with check (author_id = app_user_id() or app_user_role() = 'ADMIN');

create policy bug_comments_delete on public.bug_comments
  for delete using (author_id = app_user_id() or app_user_role() = 'ADMIN');

alter table public.bug_comment_reactions enable row level security;

create policy bug_comment_reactions_select on public.bug_comment_reactions
  for select using (
    exists (
      select 1 from public.bug_comments c join public.bugs b on b.id = c.bug_id
      where c.id = bug_comment_reactions.bug_comment_id and can_access_game(b.game_id)
    )
  );

create policy bug_comment_reactions_write on public.bug_comment_reactions
  for all using (
    user_id = app_user_id()
    and app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER', 'DEVELOPER')
  )
  with check (
    user_id = app_user_id()
    and app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER', 'DEVELOPER')
  );

alter table public.bug_attachments enable row level security;

create policy bug_attachments_select on public.bug_attachments
  for select using (
    exists (select 1 from public.bugs b where b.id = bug_attachments.bug_id and can_access_game(b.game_id))
  );

-- UPLOAD_EVIDENCE: Admin, QA Lead, QA Tester, Developer
create policy bug_attachments_insert on public.bug_attachments
  for insert with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER', 'DEVELOPER')
    and exists (select 1 from public.bugs b where b.id = bug_attachments.bug_id and can_access_game(b.game_id))
  );

create policy bug_attachments_delete on public.bug_attachments
  for delete using (app_user_role() in ('ADMIN', 'QA_LEAD'));

alter table public.bug_history enable row level security;

create policy bug_history_select on public.bug_history
  for select using (
    exists (select 1 from public.bugs b where b.id = bug_history.bug_id and can_access_game(b.game_id))
  );

-- bug_history is a system-written audit trail (the app writes one
-- alongside every bug mutation, see the equivalent ActivityEvent writes
-- in the live app's server actions) — any authenticated user who can
-- already act on the bug may append to it, but nothing ever updates or
-- deletes a history row.
create policy bug_history_insert on public.bug_history
  for insert with check (
    exists (select 1 from public.bugs b where b.id = bug_history.bug_id and can_access_game(b.game_id))
  );

-- ── test_cases / test_case_steps / test_executions / test_execution_steps

alter table public.test_cases enable row level security;

create policy test_cases_select on public.test_cases
  for select using (can_access_game(game_id));

-- MANAGE_TEST_CASES: Admin, QA Lead only
create policy test_cases_write on public.test_cases
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and can_access_game(game_id));

alter table public.test_case_steps enable row level security;

create policy test_case_steps_select on public.test_case_steps
  for select using (
    exists (select 1 from public.test_cases tc where tc.id = test_case_steps.test_case_id and can_access_game(tc.game_id))
  );

create policy test_case_steps_write on public.test_case_steps
  for all using (
    app_user_role() in ('ADMIN', 'QA_LEAD')
    and exists (select 1 from public.test_cases tc where tc.id = test_case_steps.test_case_id and can_access_game(tc.game_id))
  )
  with check (
    app_user_role() in ('ADMIN', 'QA_LEAD')
    and exists (select 1 from public.test_cases tc where tc.id = test_case_steps.test_case_id and can_access_game(tc.game_id))
  );

alter table public.test_executions enable row level security;

create policy test_executions_select on public.test_executions
  for select using (
    exists (select 1 from public.test_sessions ts where ts.id = test_executions.test_session_id and can_access_game(ts.game_id))
  );

-- EXECUTE_TESTS: Admin, QA Lead, QA Tester
create policy test_executions_insert on public.test_executions
  for insert with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and (user_id = app_user_id() or user_id is null)
    and exists (select 1 from public.test_sessions ts where ts.id = test_executions.test_session_id and can_access_game(ts.game_id))
  );

create policy test_executions_delete on public.test_executions
  for delete using (app_user_role() in ('ADMIN', 'QA_LEAD'));

alter table public.test_execution_steps enable row level security;

create policy test_execution_steps_select on public.test_execution_steps
  for select using (
    exists (
      select 1 from public.test_executions te join public.test_sessions ts on ts.id = te.test_session_id
      where te.id = test_execution_steps.test_execution_id and can_access_game(ts.game_id)
    )
  );

create policy test_execution_steps_insert on public.test_execution_steps
  for insert with check (
    app_user_role() in ('ADMIN', 'QA_LEAD', 'QA_TESTER')
    and exists (
      select 1 from public.test_executions te join public.test_sessions ts on ts.id = te.test_session_id
      where te.id = test_execution_steps.test_execution_id and can_access_game(ts.game_id)
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

-- A null recipient is a team-wide event; a set recipient is personal —
-- the same real-event model as src/lib/notifications.ts in the live app.
create policy notifications_select on public.notifications
  for select using (recipient_id = app_user_id() or recipient_id is null);

-- Marking a notification read is the only user-facing write, and only
-- ever on your own notification (or a team-wide one, since "read" is
-- meaningful per-viewer even for those in the live app's actual model —
-- kept permissive here to match).
create policy notifications_update on public.notifications
  for update using (recipient_id = app_user_id() or recipient_id is null)
  with check (recipient_id = app_user_id() or recipient_id is null);

-- System-written (see src/lib/notifications.ts's createNotification,
-- called from every server action that generates one) — any authenticated
-- user whose own action produced the event may insert it.
create policy notifications_insert on public.notifications
  for insert with check (true);

-- ── ai_conversations / ai_messages ───────────────────────────────────────
-- Schema-only today (see the top of schema.prisma) — policies are still
-- real and correct for whenever this becomes a live feature: a
-- conversation is private to the user who started it.

alter table public.ai_conversations enable row level security;

create policy ai_conversations_select on public.ai_conversations
  for select using (user_id = app_user_id() or app_user_role() = 'ADMIN');

create policy ai_conversations_write on public.ai_conversations
  for all using (user_id = app_user_id()) with check (user_id = app_user_id());

alter table public.ai_messages enable row level security;

create policy ai_messages_select on public.ai_messages
  for select using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and (c.user_id = app_user_id() or app_user_role() = 'ADMIN')
    )
  );

create policy ai_messages_write on public.ai_messages
  for all using (
    exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = app_user_id())
  )
  with check (
    exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = app_user_id())
  );

-- ── reports / release_gates ──────────────────────────────────────────────

alter table public.reports enable row level security;

create policy reports_select on public.reports
  for select using (game_id is null or can_access_game(game_id));

create policy reports_insert on public.reports
  for insert with check (game_id is null or can_access_game(game_id));

alter table public.release_gates enable row level security;

create policy release_gates_select on public.release_gates
  for select using (game_id is null or can_access_game(game_id));

-- MANAGE_SETTINGS: Admin, QA Lead only
create policy release_gates_write on public.release_gates
  for all using (app_user_role() in ('ADMIN', 'QA_LEAD') and (game_id is null or can_access_game(game_id)))
  with check (app_user_role() in ('ADMIN', 'QA_LEAD') and (game_id is null or can_access_game(game_id)));
