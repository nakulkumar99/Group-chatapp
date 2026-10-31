import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initializing: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  deleteAccount: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initializing: true,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        initializing: false,
      });
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session error:", error);
        setState({ user: null, session: null, loading: false, initializing: false });
      } else {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          initializing: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { username },
        },
      });
      if (error?.message?.includes("Failed to fetch")) {
        return { error: { message: "Network error. Please check your connection and try again." } };
      }
      return { error };
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch")) {
        return { error: { message: "Network error. Please check your connection and try again." } };
      }
      return { error: { message: "An unexpected error occurred. Please try again." } };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error?.message?.includes("Failed to fetch")) {
        return { error: { message: "Network error. Please check your connection and try again." } };
      }
      return { error };
    } catch (err: any) {
      if (err?.message?.includes("Failed to fetch")) {
        return { error: { message: "Network error. Please check your connection and try again." } };
      }
      return { error: { message: "An unexpected error occurred. Please try again." } };
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const deleteAccount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: new Error("Not authenticated") };

    const { error } = await supabase.functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) return { error };
    await supabase.auth.signOut();
    return { error: null };
  }, []);

  const value: AuthContextValue = {
    ...state,
    signUp,
    signIn,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
