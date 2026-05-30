-- AI Insights table — stores cached coaching nudges and reflection summaries
create table if not exists ai_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete cascade not null,
  type text not null check (type in ('coaching', 'reflection')),
  period text not null check (period in ('daily', 'weekly', 'monthly')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
alter table ai_insights enable row level security;
create policy "own insights" on ai_insights for all using (auth.uid() = user_id);

create index if not exists ai_insights_user_type_created
  on ai_insights(user_id, type, created_at desc);
