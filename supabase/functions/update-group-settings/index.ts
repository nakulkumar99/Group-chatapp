import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "PUT" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    const body = await req.json();
    const { groupId, settings } = body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!groupId || typeof groupId !== "string" || !uuidRegex.test(groupId)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing groupId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid settings object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (JSON.stringify(settings).length > 1024) {
      return new Response(
        JSON.stringify({ error: "Settings object too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedSettings = ['only_admins_can_send', 'only_admins_can_add_members'];
    const validatedSettings: Record<string, boolean> = {};

    for (const key of Object.keys(settings)) {
      if (!allowedSettings.includes(key)) {
        return new Response(
          JSON.stringify({ error: `Invalid setting: ${key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof settings[key] !== 'boolean') {
        return new Response(
          JSON.stringify({ error: `Setting ${key} must be a boolean` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      validatedSettings[key] = settings[key];
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("created_by, settings")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return new Response(
        JSON.stringify({ error: "Group not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGroupCreator = group.created_by === requestingUserId;

    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", requestingUserId)
      .single();

    const isAdmin = isGroupCreator || userRole?.role === "admin";

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can update group settings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentSettings = (group.settings as Record<string, unknown>) || {};
    const newSettings = { ...currentSettings, ...validatedSettings };

    const { error: updateError } = await supabaseAdmin
      .from("groups")
      .update({ settings: newSettings })
      .eq("id", groupId);

    if (updateError) {
      console.error("Settings update failed");
      return new Response(
        JSON.stringify({ error: "Failed to update settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, settings: newSettings }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Request processing failed");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
