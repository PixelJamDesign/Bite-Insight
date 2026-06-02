-- Lets the invited person (who isn't the inviter, so can't read the
-- family_invites row via RLS) fetch just enough to personalise the accept
-- screen: the inviter's name + photo, and whether the invite is still
-- valid. Only non-sensitive display fields are exposed, and only for the
-- exact token (which is the invite link itself).
create or replace function public.family_invite_preview(p_token text)
returns table (
  status text,
  valid boolean,
  inviter_name text,
  inviter_avatar_url text,
  member_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    fi.status,
    (fi.status = 'pending' and fi.expires_at > now()) as valid,
    p.full_name as inviter_name,
    p.avatar_url as inviter_avatar_url,
    fp.name as member_name
  from public.family_invites fi
  join public.profiles p on p.id = fi.inviter_user_id
  left join public.family_profiles fp on fp.id = fi.family_profile_id
  where fi.token = p_token
  limit 1;
$$;

grant execute on function public.family_invite_preview(text) to authenticated;
