import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "PUT" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;
    console.log("Authenticated user:", requestingUserId);

    // Parse request body
    const { groupId, settings } = await req.json();

    if (!groupId || !settings) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: groupId, settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Settings update request for group ${groupId}:`, settings);

    // Use service role for permission check and update
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is the group creator OR has admin role
    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("created_by, settings")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      console.log("Group not found:", groupError);
      return new Response(
        JSON.stringify({ error: "Group not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isGroupCreator = group.created_by === requestingUserId;

    // Check if user has admin role in the group
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", requestingUserId)
      .single();

    const isAdmin = isGroupCreator || userRole?.role === "admin";

    if (!isAdmin) {
      console.log("Permission denied: User is not admin");
      return new Response(
        JSON.stringify({ error: "Only admins can update group settings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Merge current settings with new settings
    const currentSettings = (group.settings as Record<string, unknown>) || {};
    const newSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update group settings
    const { error: updateError } = await supabaseAdmin
      .from("groups")
      .update({ settings: newSettings })
      .eq("id", groupId);

    if (updateError) {
      console.log("Failed to update settings:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Settings updated successfully:", newSettings);

    return new Response(
      JSON.stringify({ success: true, settings: newSettings }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
