-- Supabase default grants may explicitly include browser roles.
revoke all on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) from anon, authenticated;
grant execute on function public.prepare_account_action(uuid,uuid,text,boolean),public.finish_account_delete(uuid,uuid) to service_role;
