import { z } from "zod";

// Phone number validation (E.164 format)
export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 phone number format (e.g., +1234567890)")
  .min(8, "Phone number too short")
  .max(16, "Phone number too long");

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(50, "Group name must be less than 50 characters"),
  description: z
    .string()
    .trim()
    .max(200, "Description must be less than 200 characters")
    .optional(),
});

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message must be less than 1000 characters"),
});

// Admin user management schemas
export const createUserSchema = z.object({
  phone_number: phoneNumberSchema,
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  bio: z
    .string()
    .trim()
    .max(200, "Bio must be less than 200 characters")
    .optional(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

export const updateUserSchema = createUserSchema.partial();

export const otpSchema = z.object({
  phone_number: phoneNumberSchema,
  otp_code: z
    .string()
    .trim()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type GroupInput = z.infer<typeof groupSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
