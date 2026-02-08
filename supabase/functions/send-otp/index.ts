import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendOtpRequest {
  phone_number: string;
}

// Rate limit constants
const MAX_OTP_SENDS_PER_IP_PER_HOUR = 10;
const IP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check for authentication - OTP should only be sent by authenticated users
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

    // IP-based rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    
    // Check IP-based rate limit using otp_verifications table
    const oneHourAgo = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count: ipRequestCount } = await supabase
      .from("otp_verifications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    // Simple IP rate limit check (checks global rate, could be enhanced with IP tracking table)
    if (ipRequestCount && ipRequestCount > 100) {
      console.log("Global rate limit exceeded");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Service is busy. Please try again later.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate request
    const { phone_number }: SendOtpRequest = await req.json();

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

    // Rate limiting: Check if OTP was sent in the last minute for this phone
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("id")
      .eq("phone_number", phone_number)
      .gte("created_at", oneMinuteAgo)
      .single();

    if (recentOtp) {
      console.log("Rate limit hit for phone:", phone_number);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please wait 1 minute before requesting a new OTP",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store OTP in database
    const { error: insertError } = await supabase.from("otp_verifications").insert({
      phone_number,
      otp_code: otpCode,
      expires_at: expiresAt,
      verified: false,
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to create OTP");
    }

    // Note: In production, you would send the OTP via SMS using Twilio or similar
    // For now, we log the OTP (development mode)
    console.log(`OTP for ${phone_number}: ${otpCode}`);

    // Check if Twilio credentials are available
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      // Send SMS via Twilio
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
        const errorText = await smsResponse.text();
        console.error("Twilio SMS error:", errorText);
        // Continue anyway - OTP is stored for verification
      } else {
        console.log("SMS sent successfully to:", phone_number);
      }
    } else {
      console.log("Twilio credentials not configured - OTP logged only");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-otp:", error);
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
