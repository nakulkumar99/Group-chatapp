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
    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the token and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Token validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Starting account deletion for user: ${userId}`);

    // Create admin client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data in order (respecting foreign key constraints)
    
    // 1. Delete message reactions for messages by this user
    const { error: reactionsError } = await adminClient
      .from("message_reactions")
      .delete()
      .eq("user_id", userId);
    if (reactionsError) console.error("Error deleting reactions:", reactionsError);

    // 2. Delete message reads by this user
    const { error: readsError } = await adminClient
      .from("message_reads")
      .delete()
      .eq("user_id", userId);
    if (readsError) console.error("Error deleting reads:", readsError);

    // 3. Delete pinned messages by this user
    const { error: pinnedError } = await adminClient
      .from("pinned_messages")
      .delete()
      .eq("pinned_by", userId);
    if (pinnedError) console.error("Error deleting pinned messages:", pinnedError);

    // 4. Delete content reports by this user
    const { error: reportsError } = await adminClient
      .from("content_reports")
      .delete()
      .eq("reporter_id", userId);
    if (reportsError) console.error("Error deleting reports:", reportsError);

    // 5. Delete messages sent by this user
    const { error: messagesError } = await adminClient
      .from("messages")
      .delete()
      .eq("user_id", userId);
    if (messagesError) console.error("Error deleting messages:", messagesError);

    // 6. Delete user roles
    const { error: rolesError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) console.error("Error deleting roles:", rolesError);

    // 7. Delete group memberships
    const { error: membersError } = await adminClient
      .from("group_members")
      .delete()
      .eq("user_id", userId);
    if (membersError) console.error("Error deleting memberships:", membersError);

    // 8. Delete profile images
    const { error: imagesError } = await adminClient
      .from("profile_images")
      .delete()
      .eq("user_id", userId);
    if (imagesError) console.error("Error deleting profile images:", imagesError);

    // 9. Delete profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (profileError) console.error("Error deleting profile:", profileError);

    // 10. Delete admin roles if any
    const { error: adminRolesError } = await adminClient
      .from("admin_roles")
      .delete()
      .eq("user_id", userId);
    if (adminRolesError) console.error("Error deleting admin roles:", adminRolesError);

    // 11. Delete user bans if any
    const { error: bansError } = await adminClient
      .from("user_bans")
      .delete()
      .eq("user_id", userId);
    if (bansError) console.error("Error deleting bans:", bansError);

    // 12. Delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
