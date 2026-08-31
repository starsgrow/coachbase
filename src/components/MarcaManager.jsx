"use client";

import { useState } from "react";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Sparkles,
  Loader2,
  Save,
  LayoutTemplate,
  UploadCloud,
  Check,
  Trash2,
} from "lucide-react";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

export default function MarcaManager({ coachInicial }) {
  const [formData, setFormData] = useState({
    nombre_marca: coachInicial?.nombre_marca || "",
    color_primario: coachInicial?.color_primario || "#6366F1",
    color_secundario: coachInicial?.color_secundario || "#0F172A",
    logo_url: coachInicial?.logo_url || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccessMsg(""); // Limpiar mensaje de éxito al editar
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setSuccessMsg("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetchWithAuth("/api/marca/subir-logo", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al subir logotipo");
      }

      setFormData((prev) => ({ ...prev, logo_url: data.logo_url }));
      setSuccessMsg("¡Logotipo subido y guardado exitosamente en Supabase Storage!");
    } catch (err) {
      console.error("Error subiendo logo:", err);
      alert("Error al subir el logo: " + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
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

            {/* Logotipo con Subida a Supabase Storage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <ImageIcon className="w-4 h-4 text-indigo-400" /> Logotipo de tu Marca
                </label>
                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: "" })}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar Logo
                  </button>
                )}
              </div>

              {/* Zona de Arrastrar y Soltar / Subida de Archivo */}
              <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all bg-slate-950/60 text-center">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />

                {isUploadingLogo ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs font-semibold text-slate-300">Subiendo a Supabase Storage...</span>
                  </div>
                ) : formData.logo_url ? (
                  <div className="py-2 flex items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Logotipo guardado en Storage
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">{formData.logo_url}</p>
                      <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Haz clic o arrastra para cambiarlo</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">
                      Arrastra tu imagen aquí o <span className="text-indigo-400 underline">haz clic para examinar</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Formatos recomendados: PNG transparente, SVG, WEBP o JPG (Máx. 5MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Entrada manual de URL alternativa */}
              <div className="pt-1">
                <input
                  type="url"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  placeholder="O pega una URL externa si ya la tienes hospedada..."
                />
              </div>
            </div>

            {/* Botón Guardar */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingLogo}
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
