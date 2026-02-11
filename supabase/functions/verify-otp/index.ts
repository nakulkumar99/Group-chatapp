import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyOtpRequest {
  phone_number: string;
  otp_code: string;
}

// Brute-force protection constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check for authentication - OTP verification should only be done by authenticated users
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user is authenticated
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid authentication token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request
    const { phone_number, otp_code }: VerifyOtpRequest = await req.json();

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      console.log("Invalid phone number format:", phone_number);
      return new Response(
        JSON.stringify({
          success: false,
          errors: { phone_number: ["Invalid E.164 phone number format"] },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate OTP format
    const otpRegex = /^\d{6}$/;
    if (!otp_code || !otpRegex.test(otp_code)) {
      console.log("Invalid OTP format:", otp_code);
      return new Response(
        JSON.stringify({
          success: false,
          errors: { otp_code: ["OTP must be 6 digits"] },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Brute-force protection: Check recent failed attempts for this phone number
    const lockoutTime = new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString();
    const { count: failedAttempts } = await supabase
      .from("otp_verifications")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", phone_number)
      .eq("verified", false)
      .gte("created_at", lockoutTime);

    if (failedAttempts && failedAttempts >= MAX_FAILED_ATTEMPTS) {
      console.log("Too many failed attempts for phone:", phone_number);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many failed attempts. Please try again in 15 minutes.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find valid OTP
    const now = new Date().toISOString();
    const { data: validOtp, error: otpError } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone_number", phone_number)
      .eq("otp_code", otp_code)
      .eq("verified", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !validOtp) {
      console.log("Invalid or expired OTP for phone:", phone_number);
      return new Response(
        JSON.stringify({
          success: false,
          errors: { otp_code: ["Invalid or expired OTP"] },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", validOtp.id);

    // Update phone data in user_phone_data table
    const { error: updateError } = await supabase
      .from("user_phone_data")
      .upsert({
        user_id: userId,
        phone_number: phone_number,
        phone_verified: true,
        phone_verified_at: now,
      }, { onConflict: "user_id" });

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't fail - OTP was valid
    }

    // Clean up old OTPs for this phone number (optional, reduces table size)
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("phone_number", phone_number)
      .eq("verified", true)
      .neq("id", validOtp.id);

    console.log("Phone verified successfully for user:", userId, "phone:", phone_number);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number verified successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
