import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const sessionCookieName = "canalmix_online_session";
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const categorySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const heartbeatSchema = z.object({
  device_type: z.enum(["mobile", "tablet", "desktop", "tv"]),
  page_key: z.enum(["home", "tv", "schedule", "channel", "privacy", "other"]),
  category_slug: z.string().max(80).regex(categorySlugPattern).nullable(),
  channel_name: z.string().trim().min(1).max(80).regex(/^[^\u0000-\u001f\u007f]+$/).nullable(),
  selected_option: z.number().int().min(1).max(50).nullable(),
}).strict().superRefine((heartbeat, context) => {
  if (heartbeat.category_slug && heartbeat.page_key !== "home" && heartbeat.page_key !== "tv") {
    context.addIssue({ code: "custom", message: "Category is only valid on catalog pages." });
  }
  if (
    heartbeat.page_key !== "channel" &&
    (heartbeat.channel_name !== null || heartbeat.selected_option !== null)
  ) {
    context.addIssue({ code: "custom", message: "Channel details are only valid on channel pages." });
  }
  if (heartbeat.selected_option !== null && heartbeat.channel_name === null) {
    context.addIssue({ code: "custom", message: "A selected option requires a channel." });
  }
});

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(sessionCookieName)?.value;
  if (!sessionId || !sessionIdPattern.test(sessionId)) {
    return new Response(null, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_048) {
    return new Response(null, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (rawBody.length > 2_048) {
    return new Response(null, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }

  const parsedHeartbeat = heartbeatSchema.safeParse(input);
  if (!parsedHeartbeat.success) {
    return new Response(null, { status: 400 });
  }

  const config = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) {
    return new Response(null, { status: 503 });
  }

  const supabase = createClient<Database>(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date();
  const cutoff = new Date(now.getTime() - 75_000).toISOString();

  const { error: cleanupError } = await supabase
    .from("online_visitor_sessions")
    .delete()
    .lt("last_activity_at", cutoff);
  if (cleanupError) {
    return new Response(null, { status: 503 });
  }

  const { data: existing, error: lookupError } = await supabase
    .from("online_visitor_sessions")
    .select("started_at, last_activity_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (lookupError) {
    return new Response(null, { status: 503 });
  }

  const startedAt = existing && Date.parse(existing.last_activity_at) >= now.getTime() - 75_000
    ? existing.started_at
    : now.toISOString();
  const { error: upsertError } = await supabase.from("online_visitor_sessions").upsert(
    {
      session_id: sessionId,
      ...parsedHeartbeat.data,
      started_at: startedAt,
      last_activity_at: now.toISOString(),
    },
    { onConflict: "session_id" },
  );

  if (upsertError) {
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 204 });
}
