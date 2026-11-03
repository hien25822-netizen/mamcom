// Mâm Cơm — add-comment edge function
//
// Inserts a review and enforces ~1 comment / 60s per device (stateful, so it
// survives the busy case; a client-side timer alone is bypassable).
//
// POST body: { rating: 1..5, text: string, name?: string, visitorId: string }
// 200 -> { id, comments: [ {id, rating, text, ts, name}, ... ] } (full list, newest first)
// 429 -> { error: "rate-limited" }
//
// Deploy:  supabase functions deploy add-comment
// (config.toml sets verify_jwt = false — the app uses the anon key, no Supabase Auth.)

import { createClient } from "npm:@supabase/supabase-js@2";

const RATE_LIMIT_SECONDS = 60;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const visitorId = String(body.visitorId || "anon");
  const text = String(body.text || "").trim().slice(0, 500);
  const name = String(body.name || "").trim().slice(0, 60); // optional
  let rating = parseInt(body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) rating = 5;

  if (!text) return json({ error: "empty comment" }, 400);

  // Edge functions run with the service role key: full access, RLS bypassed.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Math.floor(Date.now() / 1000);

  // ---- rate limit: one comment per 60s per device -----------------------
  const { data: rl } = await supabase
    .from("rate_limits")
    .select("last_ts")
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (rl && rl.last_ts != null && now - rl.last_ts < RATE_LIMIT_SECONDS) {
    return json({ error: "rate-limited" }, 429);
  }

  // ---- insert the comment ----------------------------------------------
  const { data: created, error: insErr } = await supabase
    .from("comments")
    .insert({ rating, text, ts: now, name })
    .select("id, rating, text, ts, name")
    .single();

  if (insErr || !created) {
    return json({ error: insErr ? insErr.message : "insert failed" }, 500);
  }

  // ---- record the window -------------------------------------------------
  await supabase
    .from("rate_limits")
    .upsert({ visitor_id: visitorId, last_ts: now });

  // ---- return the refreshed list (newest first) -------------------------
  const { data: rows, error: listErr } = await supabase
    .from("comments")
    .select("id, rating, text, ts")
    .order("ts", { ascending: false })
    .order("id", { ascending: false });

  if (listErr) return json({ error: listErr.message }, 500);

  return json({ id: created.id, comments: rows || [] }, 200);
});
