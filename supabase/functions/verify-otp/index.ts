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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // Update profile phone_verified status
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone_verified: true,
        phone_verified_at: now,
      })
      .eq("phone_number", phone_number);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't fail - OTP was valid
    }

    console.log("Phone verified successfully:", phone_number);

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
