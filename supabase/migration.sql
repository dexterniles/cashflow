-- Create types
create type category_type as enum ('income', 'expense');
create type category_group as enum ('Housing', 'Food', 'Transport', 'Utilities', 'Lifestyle', 'Savings', 'Income');

-- Create categories table
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  type category_type not null,
  "group" category_group not null,
  budget_limit numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for categories
alter table categories enable row level security;

create policy "Users can view own categories"
  on categories for select
  using ( auth.uid() = user_id );

create policy "Users can insert own categories"
  on categories for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own categories"
  on categories for update
  using ( auth.uid() = user_id );

create policy "Users can delete own categories"
  on categories for delete
  using ( auth.uid() = user_id );

-- Modify transactions table
alter table transactions 
add column category_id uuid references categories(id),
add column reviewed boolean default false,
add column merchant_logo text;

-- Data Migration
do $$
declare
  user_record record;
  default_categories constant jsonb := '[
    {"name": "Rent", "type": "expense", "group": "Housing", "icon": "home"},
    {"name": "Mortgage", "type": "expense", "group": "Housing", "icon": "home"},
    {"name": "Groceries", "type": "expense", "group": "Food", "icon": "shopping-cart"},
    {"name": "Restaurants", "type": "expense", "group": "Food", "icon": "utensils"},
    {"name": "Salary", "type": "income", "group": "Income", "icon": "briefcase"},
    {"name": "Utilities", "type": "expense", "group": "Utilities", "icon": "zap"},
    {"name": "Internet", "type": "expense", "group": "Utilities", "icon": "wifi"},
    {"name": "Phone", "type": "expense", "group": "Utilities", "icon": "smartphone"},
    {"name": "Transport", "type": "expense", "group": "Transport", "icon": "car"},
    {"name": "Gas", "type": "expense", "group": "Transport", "icon": "fuel"},
    {"name": "Entertainment", "type": "expense", "group": "Lifestyle", "icon": "film"},
    {"name": "Shopping", "type": "expense", "group": "Lifestyle", "icon": "shopping-bag"},
    {"name": "Health", "type": "expense", "group": "Lifestyle", "icon": "heart"},
    {"name": "Savings", "type": "expense", "group": "Savings", "icon": "piggy-bank"}
  ]';
  cat jsonb;
begin
  -- Loop through all users
  for user_record in select id from auth.users loop
    -- Insert default categories for each user
    for cat in select * from jsonb_array_elements(default_categories) loop
      insert into categories (user_id, name, type, "group", icon)
      values (
        user_record.id, 
        cat->>'name', 
        (cat->>'type')::category_type, 
        (cat->>'group')::category_group,
        cat->>'icon'
      );
    end loop;
    
    -- Migrate existing transactions
    -- Update category_id based on text match with category name
    update transactions t
    set category_id = c.id
    from categories c
    where t.user_id = user_record.id 
      and c.user_id = user_record.id
      and lower(t.category) = lower(c.name);
      
    -- Mark existing transactions as reviewed (since they are old)
    update transactions
    set reviewed = true
    where user_id = user_record.id;
    
  end loop;
end $$;
