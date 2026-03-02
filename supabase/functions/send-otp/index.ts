import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

import { getCorsHeaders } from "../_shared/cors.ts";

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

    // Per-user rate limiting
    const { data: userLimit } = await supabase
      .from("otp_user_rate_limits")
      .select("request_count, window_start")
      .eq("user_id", userId)
      .single();

    if (userLimit) {
      const hoursSinceStart = (Date.now() - new Date(userLimit.window_start).getTime()) / RATE_LIMIT_WINDOW_MS;

      if (hoursSinceStart >= 1) {
        await supabase.from("otp_user_rate_limits")
          .update({ request_count: 1, window_start: new Date().toISOString() })
          .eq("user_id", userId);
      } else if (userLimit.request_count >= MAX_USER_OTP_PER_HOUR) {
        return new Response(
          JSON.stringify({ success: false, message: "Too many OTP requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        await supabase.from("otp_user_rate_limits")
          .update({ request_count: userLimit.request_count + 1 })
          .eq("user_id", userId);
      }
    } else {
      await supabase.from("otp_user_rate_limits")
        .insert({ user_id: userId, request_count: 1 });
    }

    const { phone_number }: SendOtpRequest = await req.json();

    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phone_number || !phoneRegex.test(phone_number)) {
      return new Response(
        JSON.stringify({ success: false, errors: { phone_number: ["Invalid E.164 phone number format"] } }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Per-phone cooldown: 1 OTP per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone_number", phone_number)
      .gte("created_at", oneMinuteAgo)
      .single();

    if (recentOtp) {
      return new Response(
        JSON.stringify({ success: false, message: "Please wait 1 minute before requesting a new OTP" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("otp_verifications").insert({
      phone_number,
      otp_code: otpCode,
      expires_at: expiresAt,
      verified: false,
    });

    if (insertError) {
      console.error("OTP storage failed");
      throw new Error("Failed to create OTP");
    }

    // Send via Twilio if configured
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const smsResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone_number,
          From: twilioPhoneNumber,
          Body: `Your verification code is: ${otpCode}. It expires in 5 minutes.`,
        }),
      });

      if (!smsResponse.ok) {
        console.error("SMS delivery failed");
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OTP send failed");
    return new Response(
      JSON.stringify({ success: false, message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
