"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowRight, Lock, Mail, User, Globe, Palette, AlertCircle } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombreMarca: "",
    slug: "",
    email: "",
    password: "",
    colorPrimario: "#6366F1",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSlugChange = (e) => {
    // Normalizar slug (solo minúsculas, números y guiones)
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData({ ...formData, slug: val });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.slug || formData.slug.length < 3) {
      setError("El subdominio debe tener al menos 3 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // 1. Crear usuario y perfil de coach en el servidor (bypasses RLS)
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error al procesar el registro.");
      }

      // 2. Iniciar sesión automáticamente en el navegador
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInErr) {
        console.warn("Cuenta creada pero requiere login manual:", signInErr);
        router.push("/auth/login");
        return;
      }

      // 3. Redirigir al panel recién creado
      router.push(`/${formData.slug}/panel`);
    } catch (err) {
      console.error("Error en registro:", err);
      setError(err.message || "Error al completar el registro. Revisa tus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-white mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black">
              CB
            </div>
            Coach <span className="text-indigo-400">Base</span>
          </Link>
          <h2 className="text-2xl font-black text-white tracking-tight">Crea tu App Marca Blanca</h2>
          <p className="text-sm text-slate-400">Configura tu perfil de coach en menos de 2 minutos</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nombre de tu Marca / App</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={formData.nombreMarca}
                onChange={(e) => setFormData({ ...formData, nombreMarca: e.target.value })}
                placeholder="Ej: Carlos Fitness, FitStudio"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Subdominio deseado</label>
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3 z-10" />
              <input
                type="text"
                required
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="carlos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-28 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="absolute right-3 text-xs text-slate-500 font-mono font-semibold">.olympo.pro</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tu app estará disponible en <code className="text-indigo-400 font-mono">{formData.slug || "tu-marca"}.olympo.pro</code>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="coach@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Color Principal de tu Marca</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.colorPrimario}
                onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
              />
              <input
                type="text"
                value={formData.colorPrimario}
                onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? "Creando tu App..." : "🚀 Lanzar Mi App Marca Blanca"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-400">
          ¿Ya tienes cuenta de Coach?{" "}
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline">
            Inicia Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
