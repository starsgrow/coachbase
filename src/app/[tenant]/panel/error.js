"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PanelError({ error, reset }) {
  useEffect(() => {
    console.error("Panel Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Algo salió mal</h2>
      <p className="text-slate-400 max-w-md mb-8">
        Hubo un problema al cargar esta sección del panel. Puede ser un problema de conexión o un error inesperado.
      </p>
      
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
      >
        <RefreshCw className="w-4 h-4" />
        Intentar de nuevo
      </button>
    </div>
  );
}
