import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signUpSchema, signInSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ForgotPasswordForm } from "@/components/profile/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/profile/ResetPasswordForm";

type AuthView = "signin" | "signup" | "forgot" | "reset";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn, signUp, user } = useAuth();
  const [view, setView] = useState<AuthView>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle password reset flow
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      setView("reset");
    }
  }, [searchParams]);

  // Redirect if already authenticated (but not during password reset)
  useEffect(() => {
    if (user && view !== "reset") {
      navigate("/");
    }
  }, [user, navigate, view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (view === "signup") {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.username
        );

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("Account created! Welcome to ChatSpace.");
        navigate("/");
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) {
              fieldErrors[err.path[0] as string] = err.message;
            }
          });
          setErrors(fieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password.");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("Welcome back!");
        navigate("/");
      }
    } catch {
      toast.error("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleResetComplete = () => {
    setSearchParams({});
    setView("signin");
  };

  const renderAuthForm = () => (
    <>
      {view === "signup" && (
        <div className="space-y-2">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="pl-10 h-12 bg-secondary border-border focus:border-primary"
            />
          </div>
          {errors.username && (
            <p className="text-destructive text-sm">{errors.username}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="pl-10 h-12 bg-secondary border-border focus:border-primary"
          />
        </div>
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="pl-10 pr-10 h-12 bg-secondary border-border focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password}</p>
        )}
      </div>

      {view === "signin" && (
        <div className="text-right">
          <button
            type="button"
            onClick={() => setView("forgot")}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 btn-twitter text-base"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : view === "signup" ? (
          "Create account"
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setView(view === "signup" ? "signin" : "signup");
            setErrors({});
          }}
          className="text-primary hover:underline transition-colors"
        >
          {view === "signup"
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4"
          >
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground">ChatSpace</h1>
          <p className="text-muted-foreground mt-2">
            {view === "signin" && "Welcome back"}
            {view === "signup" && "Create your account"}
            {view === "forgot" && "Reset your password"}
            {view === "reset" && "Set new password"}
          </p>
        </div>

        {/* Form */}
        <motion.div
          key={view}
          initial={{ opacity: 0, x: view === "forgot" || view === "reset" ? 20 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card rounded-2xl p-8 space-y-6"
        >
          {view === "forgot" && (
            <ForgotPasswordForm onBack={() => setView("signin")} />
          )}

          {view === "reset" && (
            <ResetPasswordForm onComplete={handleResetComplete} />
          )}

          {(view === "signin" || view === "signup") && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {renderAuthForm()}
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
