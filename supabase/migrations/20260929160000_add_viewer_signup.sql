create or replace function private.create_viewer_member_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_members (user_id, email, display_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '새 사용자'
    ),
    'viewer',
    true
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_viewer_member_for_new_user() from public, anon, authenticated;

drop trigger if exists create_viewer_member_after_signup on auth.users;
create trigger create_viewer_member_after_signup
  after insert on auth.users
  for each row execute procedure private.create_viewer_member_for_new_user();
