-- Run ONCE as postgres, after the migration. Never commit the returned password.
-- A dedicated login inherits only analysis permissions; it is not a service role.
do $$
declare generated_password text := encode(extensions.gen_random_bytes(32),'hex');
begin
  if exists(select 1 from pg_roles where rolname='disbunk_cluster_login') then
    raise exception 'Worker login already exists; do not rotate it unintentionally';
  end if;
  execute format('create role disbunk_cluster_login login inherit password %L',generated_password);
  grant disbunk_cluster_worker to disbunk_cluster_login;
  perform set_config('disbunk.new_worker_password',generated_password,false);
end $$;
select current_setting('disbunk.new_worker_password') as worker_password;
