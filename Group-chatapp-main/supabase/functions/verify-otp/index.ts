import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { getCorsHeaders } from "../_shared/cors.ts";

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

interface VerifyOtpRequest {
  phone_number: string;
  otp_code: string;
}

async function hashOtp(otp: string): Promise<string> {
  const data = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone_number, otp_code }: VerifyOtpRequest = await req.json();

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ success: false, errors: { phone_number: ["Invalid E.164 phone number format"] } }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpRegex = /^\d{6}$/;
    if (!otp_code || !otpRegex.test(otp_code)) {
      return new Response(
        JSON.stringify({ success: false, errors: { otp_code: ["OTP must be 6 digits"] } }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Brute-force protection
    const lockoutTime = new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString();
    const { count: failedAttempts } = await supabase
      .from("otp_verifications")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phone_number)
      .eq("verified", false)
      .gte("created_at", lockoutTime);

    if (failedAttempts && failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return new Response(
        JSON.stringify({ success: false, message: "Too many failed attempts. Please try again in 15 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpHash = await hashOtp(otp_code);
    const now = new Date().toISOString();
    const { data: validOtp, error: otpError } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone_number", phone_number)
      .eq("otp_code", otpHash)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !validOtp) {
      return new Response(
        JSON.stringify({ success: false, errors: { otp_code: ["Invalid or expired OTP"] } }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", validOtp.id);

    const { error: updateError } = await supabase
      .from("user_phone_data")
      .upsert({
        user_id: userId,
        phone_number: phone_number,
        phone_verified: true,
        phone_verified_at: now,
      }, { onConflict: "user_id" });

    if (updateError) {
      console.error("Phone data update failed");
    }

    // Clean up old verified OTPs
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("phone_number", phone_number)
      .eq("verified", true)
      .neq("id", validOtp.id);

    // Clean up expired unverified OTPs
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("phone_number", phone_number)
      .eq("verified", false)
      .lt("expires_at", now);

    return new Response(
      JSON.stringify({ success: true, message: "Phone number verified successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OTP verification failed");
    return new Response(
      JSON.stringify({ success: false, message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
