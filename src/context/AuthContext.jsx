/**
 * AuthContext - FINAL STABLE VERSION
 * Anti infinite loading
 * Safe for PWA, StrictMode, slow network
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("Auth session error:", error.message);
          return;
        }

        if (data?.session?.user && isMounted) {
          setUser(data.session.user);
          await loadProfile(data.session.user.id);
        }
      } catch (err) {
        console.warn("Auth init failed:", err);
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initAuth();

    // AUTH STATE CHANGE (AFTER INIT ONLY)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!initializedRef.current) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // FAILSAFE: loading tidak boleh lebih dari 2 detik
    const failSafe = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false); // silent fallback
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile not found:", error.message);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.warn("Load profile failed:", err);
      setProfile(null);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.warn("Sign out failed:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
