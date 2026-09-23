-- ═══════════════════════════════════════════════════════════════
-- Veyra Studio v2 — schéma simplifié (usage perso)
-- Posts Instagram / TikTok, abonnés, notifications push.
-- Les anciennes tables (studio_data, scheduled_posts…) ne sont pas touchées.
-- ═══════════════════════════════════════════════════════════════

-- ─── Profil / réglages ───
create table if not exists public.vs_profiles (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  display_name text not null default '',
  ig_handle text not null default '',
  tt_handle text not null default '',
  ig_bio text not null default '',
  tt_bio text not null default '',
  avatar_path text,
  reminder_minutes int not null default 0,
  updated_at timestamptz not null default now()
);

-- ─── Posts ───
create table if not exists public.vs_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  platform text not null check (platform in ('instagram', 'tiktok')),
  format text not null default 'post',
  title text not null default '',
  caption text not null default '',
  hashtags text not null default '',
  first_comment text not null default '',
  script jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  cover_path text,
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('idea', 'draft', 'ready', 'published')),
  published_at timestamptz,
  post_url text,
  stats jsonb not null default '{}'::jsonb,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vs_posts_user_sched on public.vs_posts (user_id, scheduled_at);
create index if not exists vs_posts_due on public.vs_posts (scheduled_at)
  where notified_at is null and status <> 'published';

-- Quand la date change, la notif doit repartir.
create or replace function public.vs_posts_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.scheduled_at is distinct from old.scheduled_at then
    new.notified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists vs_posts_touch on public.vs_posts;
create trigger vs_posts_touch before update on public.vs_posts
  for each row execute function public.vs_posts_touch();

-- ─── Suivi abonnés ───
create table if not exists public.vs_followers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  platform text not null check (platform in ('instagram', 'tiktok')),
  day date not null default current_date,
  count int not null check (count >= 0),
  unique (user_id, platform, day)
);

-- ─── Abonnements push ───
create table if not exists public.vs_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ─── RLS : chacune ne voit que ses données ───
alter table public.vs_profiles enable row level security;
alter table public.vs_posts enable row level security;
alter table public.vs_followers enable row level security;
alter table public.vs_push_subscriptions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['vs_profiles', 'vs_posts', 'vs_followers', 'vs_push_subscriptions'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ─── Stockage des médias (privé, un dossier par utilisatrice) ───
insert into storage.buckets (id, name, public)
values ('vs-media', 'vs-media', false)
on conflict (id) do nothing;

drop policy if exists vs_media_own on storage.objects;
create policy vs_media_own on storage.objects for all to authenticated
  using (bucket_id = 'vs-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'vs-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─── Rappel "C'est l'heure de poster" : appel de la fonction chaque minute ───
-- Prérequis : secret Vault 'vs_cron_secret' (même valeur que le secret de fonction CRON_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('vs-notify-due-posts')
  where exists (select 1 from cron.job where jobname = 'vs-notify-due-posts');
end $$;

select cron.schedule(
  'vs-notify-due-posts',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/vs-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'vs_cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- ─── Ménage quotidien des journaux (sinon la base se remplit : ~110 Mo en 6 mois) ───
do $$
begin
  perform cron.unschedule('vs-purge-logs')
  where exists (select 1 from cron.job where jobname = 'vs-purge-logs');
end $$;

select cron.schedule(
  'vs-purge-logs',
  '15 3 * * *',
  $cron$
  delete from cron.job_run_details where end_time < now() - interval '2 days';
  delete from net._http_response where created < now() - interval '2 days';
  $cron$
);
