-- Visitor heartbeats are validated and written by the server route, not by a public RPC.
drop function if exists public.heartbeat_online_visitor_session(uuid, text, text, text, text, integer);

grant select, insert, update, delete on public.online_visitor_sessions to service_role;
