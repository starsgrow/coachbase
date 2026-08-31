"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, Lock, Mail, AlertCircle, ArrowLeft, ShieldCheck, Dumbbell } from "lucide-react";

export default function TenantLoginView({ tenant, coach }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nombreMarca = coach?.nombre_marca || `${tenant.toUpperCase()} Performance`;
  const colorPrimario = coach?.color_primario || "#6366F1";
  const colorSecundario = coach?.color_secundario || "#0F172A";
  const logoUrl = coach?.logo_url || null;
  const initials = tenant.substring(0, 2).toUpperCase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginErr) throw loginErr;

      // Verificar si el usuario que ingresó es el coach del tenant
      const { data: coachOwner } = await supabase
        .from("coaches")
        .select("slug, id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (coachOwner && coachOwner.slug === tenant) {
        // Es el coach dueño de este tenant -> redirigir a su panel de administración
        router.push(`/${tenant}/panel`);
      } else {
        // Es un alumno o cliente -> redirigir a su portal de entrenamiento
        router.push(`/${tenant}`);
      }
    } catch (err) {
      console.error("Error en login de tenant:", err);
      setError(err.message || "Credenciales inválidas. Verifica tu correo y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        
        {/* Cabecera con Logotipo y Branding del Coach */}
        <div className="text-center space-y-3">
          <Link href={`/${tenant}`} className="inline-flex items-center justify-center group mb-1">
            {logoUrl ? (
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt={nombreMarca} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl group-hover:scale-105 transition-transform"
                style={{ backgroundColor: colorPrimario }}
              >
                {initials}
              </div>
            )}
          </Link>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{nombreMarca}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Portal Oficial de Entrenamiento y Nutrición Personalizada
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-3 disabled:opacity-50 active:scale-95"
            style={{ backgroundColor: colorPrimario }}
          >
            {loading ? "Ingresando..." : "Ingresar a Mi Portal"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Enlaces de pie de login */}
        <div className="border-t border-slate-800/80 pt-5 space-y-3 text-center text-xs text-slate-400">
          <Link
            href={`/${tenant}`}
            className="text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a la página principal de {nombreMarca}
          </Link>

          <div className="pt-2 text-[11px] text-slate-500">
            ¿Eres coach y quieres crear tu propia app?{" "}
            <Link href="/auth/registro" className="text-indigo-400 hover:text-indigo-300 underline font-semibold">
              Crear App en CoachBase
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
