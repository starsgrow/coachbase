"use client";

import { useState } from "react";
import { Download, Loader2, Check } from "lucide-react";
import { generarPDFDieta } from "@/lib/generadorPdfDieta";

export default function BotonDescargaDietaPDF({
  plan,
  coachNombre = "Coach Olympo",
  coachTenant = "",
  coachLogo = null,
  coachColorPrimario = "#10B981",
  clienteNombre = "",
  className = "",
  compact = false,
}) {
  const [generando, setGenerando] = useState(false);
  const [descargado, setDescargado] = useState(false);

  const handleDescargar = async (e) => {
    e.stopPropagation();
    if (!plan) return;

    setGenerando(true);
    try {
      await generarPDFDieta({
        plan,
        coachNombre,
        coachTenant,
        coachLogo,
        coachColorPrimario,
        clienteNombre,
      });
      setDescargado(true);
      setTimeout(() => setDescargado(false), 2500);
    } catch (err) {
      console.error("Error al generar PDF de la dieta:", err);
      alert("No se pudo generar el PDF del plan nutricional: " + err.message);
    } finally {
      setGenerando(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleDescargar}
        disabled={generando}
        title="Descargar Plan de Nutrición en PDF"
        className={`p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition-all ${className}`}
      >
        {generando ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        ) : descargado ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDescargar}
      disabled={generando}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all shadow-sm ${className}`}
    >
      {generando ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generando PDF...</span>
        </>
      ) : descargado ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>¡PDF Descargado!</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          <span>Descargar PDF</span>
        </>
      )}
    </button>
  );
}
