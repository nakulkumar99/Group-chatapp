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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = user.id;
    console.log("Authenticated user:", requestingUserId);

    // Parse request body
    const { groupId, targetUserId, newRole } = await req.json();

    if (!groupId || !targetUserId || !newRole) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: groupId, targetUserId, newRole" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "moderator", "member"];
    if (!validRoles.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, moderator, or member" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Role update request: ${targetUserId} -> ${newRole} in group ${groupId}`);

    // Check if requesting user is admin in the group (using service role for this check)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is the group creator OR has admin role
    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("created_by")
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
        JSON.stringify({ error: "Only admins can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent changing the group creator's role
    if (targetUserId === group.created_by) {
      return new Response(
        JSON.stringify({ error: "Cannot change the group owner's role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user has an existing role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", targetUserId)
      .single();

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: newRole })
        .eq("id", existingRole.id);

      if (updateError) {
        console.log("Failed to update role:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Insert new role
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          group_id: groupId,
          user_id: targetUserId,
          role: newRole,
        });

      if (insertError) {
        console.log("Failed to insert role:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to assign role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Role updated successfully: ${targetUserId} is now ${newRole}`);

    return new Response(
      JSON.stringify({ success: true, message: `Role updated to ${newRole}` }),
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
