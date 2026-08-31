"use client";
import { useState, useRef } from "react";
import * as tus from "tus-js-client";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { X, Play, Dumbbell, Award, UploadCloud, CheckCircle2, AlertTriangle, Eye, EyeOff, Film, Sparkles, BookOpen } from "lucide-react";

export default function ExerciseDetailModal({ ejercicio, coachId, onClose, onUpdated }) {
  const [activo, setActivo] = useState(ejercicio.es_activo !== false);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const fileInputRef = useRef(null);

  const nombre = ejercicio.nombre_ejercicio || ejercicio.nombre;
  const musculos = ejercicio.musculos_principales || ejercicio.grupo_muscular || "General";
  const equipamiento = Array.isArray(ejercicio.equipamiento_necesario)
    ? ejercicio.equipamiento_necesario.join(", ")
    : ejercicio.equipamiento || "No especificado";
  const dificultad = Array.isArray(ejercicio.nivel_recomendado)
    ? ejercicio.nivel_recomendado.join(", ")
    : (ejercicio.dificultad || "Intermedio");
  const thumbnail = ejercicio.thumbnail_url || ejercicio.preview_url_webp;
  const videoUrl = ejercicio.video_demo_url || ejercicio.storage_video;
  const esPropioCoach = !!ejercicio.video_demo_url;

  const handleToggleActive = async (e) => {
    e.stopPropagation();
    const nuevoEstado = !activo;
    setActivo(nuevoEstado);

    if (onUpdated) {
      onUpdated({ ...ejercicio, es_activo: nuevoEstado });
    }

    try {
      await fetchWithAuth("/api/ejercicios/visibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ejercicio_id: ejercicio.id || ejercicio.slug,
          coach_id: coachId,
          es_activo: nuevoEstado
        })
      });
    } catch (err) {
      console.error("Error al guardar visibilidad:", err);
    }
  };

  const handleUploadVariant = async () => {
    if (!file) return;

    setUploading(true);
    setIsError(false);
    setStatusMessage("Preparando subida segura de tu video...");

    try {
      const slotRes = await fetchWithAuth("/api/ejercicios/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: `Variante ${nombre}`, coach_id: coachId })
      });

      const slotData = await slotRes.json();
      if (!slotRes.ok || slotData.error) throw new Error(slotData.error || "Error al preparar subida");

      const { bunnyVideoId, libraryId, authSignature, expirationTime } = slotData;

      setStatusMessage("Subiendo tu video de demostración...");

      await new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: authSignature,
            AuthorizationExpire: expirationTime.toString(),
            VideoId: bunnyVideoId,
            LibraryId: libraryId
          },
          metadata: {
            filetype: file.type,
            title: `Variante ${nombre}`
          },
          onError: (err) => reject(new Error("Error en la subida: " + err.message)),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setProgress(pct);
          },
          onSuccess: () => resolve()
        });
        upload.start();
      });

      setStatusMessage("Guardando tu variante en tu catálogo personal...");

      const saveRes = await fetchWithAuth("/api/ejercicios/guardar-variante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ejercicio_id: ejercicio.id || ejercicio.slug,
          coach_id: coachId,
          bunny_video_id: bunnyVideoId,
          es_ejercicio_global: !ejercicio.coach_id
        })
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error || "Error al guardar variante");

      setUploading(false);
      setProgress(100);
      setStatusMessage("¡Tu video de demostración se guardó con éxito!");
      setFile(null);

      if (onUpdated && saveData.ejercicio) {
        onUpdated(saveData.ejercicio);
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatusMessage(err.message || "Error al procesar la subida");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100 relative flex flex-col">
        
        {/* Cabecera compacta con Toggle ON/OFF */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white line-clamp-1">{nombre}</h3>
            {esPropioCoach && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-md">
                <Award className="w-3.5 h-3.5" /> SUBIDO 🏅
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Toggle ON/OFF en cabecera */}
            <button
              onClick={handleToggleActive}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activo
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{activo ? "Visible para Alumnos" : "Oculto"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* SECCIÓN SUPERIOR: 2 Columnas (Izquierda: Video Inline | Derecha: Subir variante) */}
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            
            {/* COLUMNA IZQUIERDA: Vista Previa de Ejecución */}
            <div className="space-y-2 flex flex-col justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-indigo-400" /> Vista Previa de Ejecución
              </h4>

              {/* Recuadro de Video Inline Compacto */}
              <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center h-full min-h-[180px]">
                {playingVideo && videoUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      controlsList={esPropioCoach ? "nodownload" : "nodownload novolume"}
                      onVolumeChange={(e) => {
                        if (!esPropioCoach && !e.target.muted) {
                          e.target.muted = true;
                          e.target.volume = 0;
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                    {!esPropioCoach && (
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 text-[10px] text-slate-300 font-medium px-2 py-0.5 rounded-md pointer-events-none z-10 flex items-center gap-1">
                        🔇 Plantilla (Sin Audio)
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    {thumbnail ? (
                      <img src={thumbnail} alt={nombre} className="w-full h-full object-cover" />
                    ) : (
                      <Dumbbell className="w-10 h-10 text-slate-700" />
                    )}

                    {videoUrl && (
                      <button
                        onClick={() => setPlayingVideo(true)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: Subir Variante Propia del Coach */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Subir Tu Variante Propia
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Reemplaza la demostración genérica subiendo tu propio video de ejecución (MP4 o MOV) para destacar tu marca.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  file
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-800 hover:border-amber-500/50 bg-slate-900/80"
                }`}
              >
                {file ? (
                  <p className="text-xs font-semibold text-amber-300 truncate">
                    📹 {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                ) : (
                  <div>
                    <UploadCloud className="w-7 h-7 mx-auto mb-1 text-amber-400" />
                    <p className="text-xs font-semibold text-slate-200">
                      Arrastra tu video de demostración (MP4, MOV)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Subida rápida en alta definición
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
              </div>

              {uploading && (
                <div className="pt-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{statusMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {statusMessage && !uploading && (
                <div
                  className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium ${
                    isError
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                onClick={handleUploadVariant}
                disabled={uploading || !file}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                {uploading ? "Guardando Video..." : "🏅 Guardar Mi Variante en Video"}
              </button>
            </div>

          </div>

          {/* SECCIÓN INFERIOR: FICHA TÉCNICA A TODO EL ANCHO HORIZONTAL */}
          <div className="border-t border-slate-800/80 pt-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Ficha Técnica e Instrucciones
            </h4>

            {/* Badges de Parámetros a Todo el Ancho */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Grupo Muscular</span>
                <span className="font-extrabold text-sm text-white">{musculos}</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Equipamiento Necesario</span>
                <span className="font-extrabold text-sm text-white leading-tight block">{equipamiento}</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">Nivel de Dificultad</span>
                <span className="font-extrabold text-sm text-white capitalize">{dificultad}</span>
              </div>
            </div>

            {/* Instrucciones de Ejecución a Todo el Ancho Horizontal */}
            {ejercicio.descripcion && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Instrucciones de Ejecución Paso a Paso
                </h5>
                <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
                  {ejercicio.descripcion}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
