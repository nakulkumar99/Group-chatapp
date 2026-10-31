import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { phoneNumberSchema, otpSchema } from "@/lib/validations";

interface OtpResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export function usePhoneAuth() {
  const [loading, setLoading] = useState(false);

  const sendOTP = useCallback(async (phoneNumber: string): Promise<OtpResponse> => {
    setLoading(true);
    try {
      // Client-side validation
      const parseResult = phoneNumberSchema.safeParse(phoneNumber);
      if (!parseResult.success) {
        return {
          success: false,
          errors: { phone_number: parseResult.error.errors.map((e) => e.message) },
        };
      }

      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone_number: phoneNumber },
      });

      if (error) {
        return {
          success: false,
          message: error.message || "Failed to send OTP",
        };
      }

      return data as OtpResponse;
    } catch (error) {
      console.error("Error sending OTP:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(
    async (phoneNumber: string, otpCode: string): Promise<OtpResponse> => {
      setLoading(true);
      try {
        // Client-side validation
        const parseResult = otpSchema.safeParse({ phone_number: phoneNumber, otp_code: otpCode });
        if (!parseResult.success) {
          const errors: Record<string, string[]> = {};
          parseResult.error.errors.forEach((e) => {
            const field = e.path[0] as string;
            if (!errors[field]) errors[field] = [];
            errors[field].push(e.message);
          });
          return { success: false, errors };
        }

        const { data, error } = await supabase.functions.invoke("verify-otp", {
          body: { phone_number: phoneNumber, otp_code: otpCode },
        });

        if (error) {
          return {
            success: false,
            message: error.message || "Failed to verify OTP",
          };
        }

        return data as OtpResponse;
      } catch (error) {
        console.error("Error verifying OTP:", error);
        return {
          success: false,
          message: "An unexpected error occurred",
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    sendOTP,
    verifyOTP,
    loading,
  };
}
