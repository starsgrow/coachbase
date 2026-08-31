"use client";

import { useState } from "react";
import { Palette, Image as ImageIcon, Type, Sparkles, Loader2, Save, LayoutTemplate } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function MarcaManager({ coachInicial }) {
  const [formData, setFormData] = useState({
    nombre_marca: coachInicial?.nombre_marca || "",
    color_primario: coachInicial?.color_primario || "#6366F1",
    color_secundario: coachInicial?.color_secundario || "#0F172A",
    logo_url: coachInicial?.logo_url || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccessMsg(""); // Limpiar mensaje de éxito al editar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");
    
    try {
      const res = await fetchWithAuth("/api/marca/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Error al guardar la marca");
      
      setSuccessMsg("¡Cambios guardados con éxito! Refresca la página para verlos en toda la app.");
      
      // Actualizar variables CSS en el DOM para vista previa instantánea en la página actual
      document.documentElement.style.setProperty('--color-primary', formData.color_primario);
      document.documentElement.style.setProperty('--color-secondary', formData.color_secundario);
      
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar la configuración.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Palette className="w-6 h-6 text-indigo-400" />
          Personalización de Marca
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configura los colores, logotipo y nombre de tu aplicación para una experiencia 100% de marca blanca.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Formulario */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nombre de Marca */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <Type className="w-4 h-4 text-indigo-400" /> Nombre de la Aplicación
              </label>
              <input
                type="text"
                name="nombre_marca"
                required
                value={formData.nombre_marca}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Ej: Juan Fit Pro"
              />
              <p className="text-xs text-slate-500 mt-2">
                Este nombre aparecerá en la barra de navegación y en los títulos de tu app.
              </p>
            </div>

            <hr className="border-slate-800" />

            {/* Colores */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Color Primario
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="color_primario"
                    value={formData.color_primario}
                    onChange={handleChange}
                    className="w-12 h-12 rounded cursor-pointer bg-slate-950 border border-slate-800"
                  />
                  <input
                    type="text"
                    name="color_primario"
                    value={formData.color_primario}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Color Secundario
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="color_secundario"
                    value={formData.color_secundario}
                    onChange={handleChange}
                    className="w-12 h-12 rounded cursor-pointer bg-slate-950 border border-slate-800"
                  />
                  <input
                    type="text"
                    name="color_secundario"
                    value={formData.color_secundario}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white font-mono text-sm uppercase"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* Logo */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" /> URL del Logotipo
              </label>
              <input
                type="url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="https://ejemplo.com/mi-logo.png"
              />
              <p className="text-xs text-slate-500 mt-2">
                Pega un enlace directo a tu imagen (PNG o JPG preferiblemente cuadrada). Si lo dejas vacío se mostrarán tus iniciales.
              </p>
            </div>

            {/* Botón Guardar */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: formData.color_primario }}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSubmitting ? "Guardando..." : "Guardar Diseño"}
              </button>
              
              {successMsg && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg text-center font-medium">
                  {successMsg}
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Vista Previa */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <LayoutTemplate className="w-4 h-4" /> Vista Previa en Vivo
          </h3>
          
          <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden sticky top-24 shadow-2xl">
            {/* Header Mock */}
            <div 
              className="px-6 py-4 border-b border-slate-800 flex items-center justify-between"
              style={{ backgroundColor: formData.color_secundario }}
            >
              <div className="flex items-center gap-3">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-cover bg-slate-800" />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black shadow-inner"
                    style={{ backgroundColor: formData.color_primario }}
                  >
                    {formData.nombre_marca ? formData.nombre_marca.substring(0,2).toUpperCase() : 'CO'}
                  </div>
                )}
                <span className="font-bold text-white tracking-tight">
                  {formData.nombre_marca || 'Tu Marca'}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                <div className="w-4 h-4 rounded-full bg-slate-800"></div>
              </div>
            </div>

            {/* Body Mock */}
            <div className="p-6 md:p-8 space-y-6 bg-slate-900/50">
              <div className="space-y-2">
                <span 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow"
                  style={{ backgroundColor: formData.color_primario }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> App Exclusiva de {formData.nombre_marca || 'Coach'}
                </span>
                <h2 className="text-3xl font-black text-white leading-tight">
                  Entrena al máximo nivel con la guía de <span style={{ color: formData.color_primario }}>{formData.nombre_marca || 'Coach'}</span>
                </h2>
              </div>
              
              <div className="flex gap-3">
                <button 
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-lg flex-1"
                  style={{ backgroundColor: formData.color_primario }}
                >
                  Botón Primario
                </button>
                <button className="px-6 py-3 rounded-xl font-bold text-white bg-slate-800 border border-slate-700 flex-1">
                  Secundario
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="h-24 bg-slate-800 rounded-2xl"></div>
                <div className="h-24 bg-slate-800 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
