import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: userError } = await supabase.auth.getClaims(token);
    if (userError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = { id: claimsData.claims.sub as string };

    const { group_id, password } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!group_id || typeof group_id !== "string" || !uuidRegex.test(group_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing group_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password !== undefined && (typeof password !== "string" || password.length > 128)) {
      return new Response(
        JSON.stringify({ error: "Invalid password format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to check password (clients can't see password column)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if group exists
    const { data: group, error: groupError } = await serviceClient
      .from("groups")
      .select("id, has_password")
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return new Response(
        JSON.stringify({ error: "Group not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check password if group has one
    if (group.has_password) {
      // Rate limit: max 5 failed attempts per (user, group) per 15 min
      const WINDOW_MS = 15 * 60 * 1000;
      const MAX_ATTEMPTS = 5;
      const now = new Date();
      const windowCutoff = new Date(now.getTime() - WINDOW_MS).toISOString();

      const { data: existingAttempt } = await serviceClient
        .from("group_join_attempts")
        .select("id, attempt_count, window_start")
        .eq("user_id", user.id)
        .eq("group_id", group_id)
        .gte("window_start", windowCutoff)
        .maybeSingle();

      if (existingAttempt && existingAttempt.attempt_count >= MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: groupPw } = await serviceClient
        .from("group_passwords")
        .select("password")
        .eq("group_id", group_id)
        .single();

      const recordFailure = async () => {
        if (existingAttempt) {
          await serviceClient
            .from("group_join_attempts")
            .update({ attempt_count: existingAttempt.attempt_count + 1 })
            .eq("id", existingAttempt.id);
        } else {
          // Clean up old expired rows for this pair, then insert
          await serviceClient
            .from("group_join_attempts")
            .delete()
            .eq("user_id", user.id)
            .eq("group_id", group_id);
          await serviceClient
            .from("group_join_attempts")
            .insert({ user_id: user.id, group_id, attempt_count: 1 });
        }
      };

      if (!password || !groupPw) {
        await recordFailure();
        return new Response(
          JSON.stringify({ error: "Incorrect password" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = bcrypt.compareSync(password, groupPw.password);
      if (!isValid) {
        await recordFailure();
        return new Response(
          JSON.stringify({ error: "Incorrect password" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Success: clear attempts
      await serviceClient
        .from("group_join_attempts")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", group_id);
    }

    // Join the group using service role
    const { error: joinError } = await serviceClient
      .from("group_members")
      .insert({ group_id, user_id: user.id });

    if (joinError) {
      if (joinError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Already a member" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to join group" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
