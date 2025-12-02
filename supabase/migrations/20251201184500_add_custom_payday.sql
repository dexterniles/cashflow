alter table settings 
add column custom_payday integer check (custom_payday >= 1 and custom_payday <= 31);
