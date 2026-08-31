"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import {
  X,
  Play,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
} from "lucide-react";

export default function ModalDetalleEjercicio({ ejercicio, isOpen = true, onClose, coachNombre = "Coach Olympo", tenant = "" }) {
  const router = useRouter();
  const [aspect, setAspect] = useState("aspect-video");
  const [copiado, setCopiado] = useState(false);
  const videoRef = useRef(null);

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    } else if (tenant) {
      router.push(`/${tenant}/rutinas`);
    } else if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  useEffect(() => {
    if (!isOpen || !ejercicio) return;

    const streamUrl = ejercicio.video_demo_url || ejercicio.hsl_link || ejercicio.url_stream;

    if (streamUrl && videoRef.current) {
      const video = videoRef.current;

      if (streamUrl.includes(".m3u8")) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            capLevelToPlayerSize: false, // Garantiza máxima resolución (1080p/4K) en pantallas Retina/High-DPI
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          return () => {
            hls.destroy();
          };
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari iOS nativo (maneja automáticamente la mejor calidad disponible)
          video.src = streamUrl;
          video.play().catch(() => {});
        }
      } else {
        video.src = streamUrl;
        video.play().catch(() => {});
      }
    }
  }, [isOpen, ejercicio]);

  if (!isOpen || !ejercicio) return null;

  const isCardio =
    (ejercicio.tipo_ejercicio || "").toLowerCase() === "cardio" ||
    (ejercicio.grupo_muscular || "").toLowerCase() === "cardio" ||
    (ejercicio.musculos_principales || "").toLowerCase() === "cardio" ||
    (ejercicio.nombre || ejercicio.nombre_ejercicio || "").toLowerCase().includes("bici") ||
    (ejercicio.nombre || ejercicio.nombre_ejercicio || "").toLowerCase().includes("cinta") ||
    (ejercicio.nombre || ejercicio.nombre_ejercicio || "").toLowerCase().includes("elíptica") ||
    (ejercicio.nombre || ejercicio.nombre_ejercicio || "").toLowerCase().includes("remo");

  const streamUrl = ejercicio.video_demo_url || ejercicio.hsl_link || ejercicio.url_stream;
  const thumbUrl = ejercicio.thumbnail_url || ejercicio.preview_url || ejercicio.preview_url_webp;

  const nombreEj = ejercicio.nombre || ejercicio.nombre_ejercicio || "Ejercicio de Entrenamiento";
  const musculo = ejercicio.grupo_muscular || ejercicio.musculos_principales || (isCardio ? "Cardio" : "General");
  const musculosSec = Array.isArray(ejercicio.musculos_secundarios)
    ? ejercicio.musculos_secundarios.join(", ")
    : ejercicio.musculos_secundarios || "";
  const equip = Array.isArray(ejercicio.equipamiento_necesario)
    ? ejercicio.equipamiento_necesario.join(", ")
    : ejercicio.equipamiento || "General";
  const nivel = Array.isArray(ejercicio.nivel_recomendado)
    ? ejercicio.nivel_recomendado.join(", ")
    : ejercicio.dificultad || ejercicio.nivel || "Intermedio";

  const handleCopiarEnlace = () => {
    if (typeof window !== "undefined") {
      const url = window.location.origin + (tenant ? `/${tenant}/ejercicios/${ejercicio.slug}` : `/ejercicios/${ejercicio.slug}`);
      navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header con botón cerrar y compartir */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg">
              {isCardio ? "⚡ Sesión de Cardio" : `💪 ${musculo}`}
            </span>
            <span className="text-xs text-slate-400 font-bold">• {coachNombre}</span>
          </div>

          <div className="flex items-center gap-2">
            {ejercicio.slug && (
              <button
                type="button"
                onClick={handleCopiarEnlace}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Copiar enlace directo"
              >
                {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copiado ? "Copiado" : "Compartir"}</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reproductor de Video / Visualizador */}
        <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
          {streamUrl ? (
            <video
              ref={videoRef}
              playsInline
              controls
              autoPlay
              muted
              loop
              poster={thumbUrl || undefined}
              className="w-full h-full object-contain"
            />
          ) : thumbUrl ? (
            <img src={thumbUrl} alt={nombreEj} className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-8">
              <Dumbbell className="w-12 h-12 text-slate-600 animate-pulse" />
              <p className="text-xs font-bold">Video demostrativo en preparación</p>
            </div>
          )}
        </div>

        {/* Contenido Técnico & Biomecánico */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
          <div>
            <h2 className="text-xl font-black text-white">{nombreEj}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[11px] font-semibold bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-slate-300">
                🏋️ {equip}
              </span>
              <span className="text-[11px] font-semibold bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-slate-300">
                🎯 {nivel}
              </span>
              {musculosSec && (
                <span className="text-[11px] font-semibold bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-slate-300">
                  Secundarios: {musculosSec}
                </span>
              )}
            </div>
          </div>

          {/* Instrucciones de Ejecución */}
          {ejercicio.descripcion && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" /> Instrucciones de Ejecución Técnica
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                {ejercicio.descripcion}
              </p>
            </div>
          )}

          {/* Beneficios y Errores */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            {ejercicio.beneficios && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Beneficios Principales
                </h4>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {Array.isArray(ejercicio.beneficios) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {ejercicio.beneficios.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ejercicio.beneficios}</p>
                  )}
                </div>
              </div>
            )}

            {ejercicio.errores_comunes && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-1.5">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Errores Comunes a Evitar
                </h4>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {Array.isArray(ejercicio.errores_comunes) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {ejercicio.errores_comunes.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{ejercicio.errores_comunes}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Plataforma Olympo • Plan de entrenamiento verificado
          </span>
          <button
            onClick={handleClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
