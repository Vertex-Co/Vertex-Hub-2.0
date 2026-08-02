-- Enterprise não possui preço público: é sempre personalizado e deve ordenar por último.
update public.plan_settings
set monthly_price=null,
    lifetime_base_price=null,
    user_limit=null,
    discount_3_months=0,
    discount_12_months=0,
    discount_lifetime=0,
    updated_at=now()
where plan='enterprise';

create or replace function public.enforce_enterprise_custom_pricing() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.plan='enterprise' then
  new.monthly_price:=null;new.lifetime_base_price:=null;new.user_limit:=null;
  new.discount_3_months:=0;new.discount_12_months:=0;new.discount_lifetime:=0;
 end if;
 return new;
end$$;
drop trigger if exists enforce_enterprise_custom_pricing_trigger on public.plan_settings;
create trigger enforce_enterprise_custom_pricing_trigger before insert or update on public.plan_settings for each row execute function public.enforce_enterprise_custom_pricing();
