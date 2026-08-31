"use client";

import { useState } from "react";
import { FileDown, Loader2, Check } from "lucide-react";
import { exportarRutinaPDF } from "@/lib/generadorPdfRutina";

export default function BotonDescargaRutinaPDF({
  rutina,
  coachNombre = "Coach Olympo",
  coachTenant = "olympocoach",
  coachLogo = null,
  coachColorPrimario = "#2563EB",
  clienteNombre = "Atleta Olympo",
  peso = null,
  altura = null,
  className = "",
  label = "Exportar PDF con Videos",
  compact = false,
}) {
  const [generando, setGenerando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const handleExport = async (e) => {
    e?.stopPropagation();
    if (!rutina) return;

    setGenerando(true);
    try {
      await exportarRutinaPDF(
        rutina,
        {
          coachNombre,
          coachTenant,
          coachLogo,
          coachColorPrimario,
          clienteNombre,
          peso,
          altura,
        }
      );

      setCompletado(true);
      setTimeout(() => setCompletado(false), 3000);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("No se pudo generar el PDF: " + err.message);
    } finally {
      setGenerando(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleExport}
        disabled={generando}
        className={`p-2 rounded-xl bg-slate-950 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-slate-800 transition-all ${className}`}
        title="Descargar PDF interactivo con videos"
      >
        {generando ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : completado ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <FileDown className="w-3.5 h-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={generando}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
        completado
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          : "bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30"
      } ${className}`}
    >
      {generando ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generando PDF...</span>
        </>
      ) : completado ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>¡PDF Descargado!</span>
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
