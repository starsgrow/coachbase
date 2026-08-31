"use client";
import { useState, useRef } from "react";
import * as tus from "tus-js-client";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { UploadCloud, CheckCircle2, AlertTriangle, Film } from "lucide-react";

export default function VideoUploader({ coachId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [metadata, setMetadata] = useState({
    titulo: "",
    categoria: "tutorial",
    descripcion: "",
    solo_premium: false
  });

  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      if (!metadata.titulo) {
        setMetadata((prev) => ({ ...prev, titulo: droppedFile.name.replace(/\.[^/.]+$/, "") }));
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !metadata.titulo) return;
    setUploading(true);
    setIsError(false);
    setStatusMessage("Obteniendo slot seguro de subida...");

    try {
      // 1️⃣ Crear slot y pedir firma SHA256 temporal al backend
      const res = await fetchWithAuth("/api/videos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...metadata,
          coach_id: coachId
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al obtener slot");

      const { bunnyVideoId, libraryId, authSignature, expirationTime } = data;

      setStatusMessage("Subiendo video de forma segura a CDN...");

      // 2️⃣ Subir usando TUS Protocol con la firma temporal
      const upload = new tus.Upload(file, {
        endpoint: `https://video.bunnycdn.com/tusupload`,
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          AuthorizationSignature: authSignature,
          AuthorizationExpire: expirationTime.toString(),
          VideoId: bunnyVideoId,
          LibraryId: libraryId
        },
        metadata: {
          filetype: file.type,
          title: file.name
        },
        onError: (err) => {
          console.error("Error TUS:", err);
          setIsError(true);
          setStatusMessage("Falló la subida del video. Inténtalo de nuevo.");
          setUploading(false);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(pct);
        },
        onSuccess: () => {
          setUploading(false);
          setProgress(100);
          setStatusMessage("¡Video subido con éxito! El procesador lo está transcodificando.");
          setFile(null);
          setMetadata({ titulo: "", categoria: "tutorial", descripcion: "", solo_premium: false });
          if (onUploadSuccess) onUploadSuccess();
        }
      });

      upload.start();
    } catch (err) {
      console.error(err);
      setIsError(true);
      setStatusMessage(err.message || "Error al procesar la subida.");
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl w-full text-slate-100">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Film className="w-5 h-5 text-indigo-400" /> Subir Video a la Comunidad
      </h3>

      {/* Zona de Drop */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          file ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-indigo-400 bg-slate-950/50"
        }`}
      >
        <UploadCloud className="w-12 h-12 mx-auto mb-2 text-indigo-400 animate-bounce" />
        {file ? (
          <p className="font-medium text-indigo-300">
            📎 {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
          </p>
        ) : (
          <div>
            <p className="font-semibold text-slate-200">Arrastra tu video aquí o haz clic para examinar</p>
            <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — Subida directa acelerada</p>
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

      {/* Formulario de Metadata */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Título del Video</label>
          <input
            type="text"
            placeholder="Ej: Técnica Correcta de Sentadilla Búlgara"
            value={metadata.titulo}
            onChange={(e) => setMetadata({ ...metadata, titulo: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Categoría</label>
            <select
              value={metadata.categoria}
              onChange={(e) => setMetadata({ ...metadata, categoria: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="tutorial">Tutorial de Ejercicio</option>
              <option value="rutina">Rutina Completa</option>
              <option value="nutricion">Tips Nutricionales</option>
              <option value="comunidad">En Vivo / Q&A</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={metadata.solo_premium}
                onChange={(e) => setMetadata({ ...metadata, solo_premium: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
              />
              Exclusivo para Premium
            </label>
          </div>
        </div>
      </div>

      {/* Barra de Progreso */}
      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{statusMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mensajes de Estado */}
      {statusMessage && !uploading && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${
            isError ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          {isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Botón de Acción */}
      <button
        onClick={handleUpload}
        disabled={uploading || !file || !metadata.titulo}
        className="w-full mt-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
      >
        {uploading ? "Subiendo..." : "🚀 Publicar Video en CDN"}
      </button>
    </div>
  );
}
