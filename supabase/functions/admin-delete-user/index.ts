import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is super_admin
    const { data: callerRole, error: roleError } = await adminClient
      .from("admin_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (roleError || !callerRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { target_user_id } = await req.json();

    if (!target_user_id || typeof target_user_id !== "string") {
      return new Response(
        JSON.stringify({ error: "target_user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (target_user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cascading deletion of all user data
    const deletions = [
      { table: "message_reactions", column: "user_id" },
      { table: "message_reads", column: "user_id" },
      { table: "pinned_messages", column: "pinned_by" },
      { table: "content_reports", column: "reporter_id" },
      { table: "messages", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "group_members", column: "user_id" },
      { table: "profile_images", column: "user_id" },
      { table: "profiles", column: "user_id" },
      { table: "admin_roles", column: "user_id" },
      { table: "user_bans", column: "user_id" },
      { table: "user_phone_data", column: "user_id" },
      { table: "otp_user_rate_limits", column: "user_id" },
    ];

    for (const { table, column } of deletions) {
      const { error } = await adminClient.from(table).delete().eq(column, target_user_id);
      if (error) {
        console.error(`Deletion failed for table: ${table}`);
      }
    }

    // Delete the auth user permanently
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(target_user_id);
    if (deleteUserError) {
      console.error("Auth user deletion failed");
      return new Response(
        JSON.stringify({ error: "Failed to delete user from auth" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the action to audit_logs
    await adminClient.from("audit_logs").insert({
      admin_id: callerId,
      action: "permanent_delete_user",
      target_type: "user",
      target_id: target_user_id,
      details: { permanent: true },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("Unexpected error during admin user deletion");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
