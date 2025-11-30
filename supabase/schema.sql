-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles Table
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on profiles for insert
  with check ( auth.uid() = id );

-- Transactions Table
create type transaction_type as enum ('income', 'expense');
create type transaction_status as enum ('cleared', 'pending', 'estimated');

create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  amount numeric not null,
  date date not null,
  description text,
  category text,
  type transaction_type not null,
  status transaction_status default 'cleared',
  is_recurring boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table transactions enable row level security;

create policy "Users can view own transactions"
  on transactions for select
  using ( auth.uid() = user_id );

create policy "Users can insert own transactions"
  on transactions for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own transactions"
  on transactions for update
  using ( auth.uid() = user_id );

create policy "Users can delete own transactions"
  on transactions for delete
  using ( auth.uid() = user_id );

-- Debts Table
create table debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  balance numeric not null,
  interest_rate numeric,
  min_payment numeric,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table debts enable row level security;

create policy "Users can view own debts"
  on debts for select
  using ( auth.uid() = user_id );

create policy "Users can insert own debts"
  on debts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own debts"
  on debts for update
  using ( auth.uid() = user_id );

create policy "Users can delete own debts"
  on debts for delete
  using ( auth.uid() = user_id );

-- Settings Table
create table settings (
  user_id uuid references auth.users not null primary key,
  hourly_rate numeric,
  tax_rate_percent numeric,
  fixed_deductions numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table settings enable row level security;

create policy "Users can view own settings"
  on settings for select
  using ( auth.uid() = user_id );

create policy "Users can insert own settings"
  on settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own settings"
  on settings for update
  using ( auth.uid() = user_id );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  insert into public.settings (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
