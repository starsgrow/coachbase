"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext({
  user: null,
  coach: null,
  loading: true,
  signOut: async () => {},
  refreshCoachProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCoachProfile = async (userId) => {
    if (!userId) {
      setCoach(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("coaches")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setCoach(data);
      } else {
        setCoach(null);
      }
    } catch (err) {
      console.error("Error al cargar perfil de coach:", err);
      setCoach(null);
    }
  };

  useEffect(() => {
    // 1. Obtener la sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          await fetchCoachProfile(currentUser.id);
        }
      } catch (err) {
        console.error("Error verificando sesión:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchCoachProfile(currentUser.id);
      } else {
        setCoach(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCoach(null);
  };

  const refreshCoachProfile = async () => {
    if (user?.id) {
      await fetchCoachProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        coach,
        loading,
        signOut,
        refreshCoachProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
