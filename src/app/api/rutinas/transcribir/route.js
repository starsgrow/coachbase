import OpenAI from "openai";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req) {
  try {
    // Auth Guard: solo coaches autenticados pueden transcribir
    const auth = await authenticateApiRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return NextResponse.json({ error: "No se proporcionó archivo de audio" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY en .env.local" }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY.trim(),
    });

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
      temperature: 0,
      prompt: "Rutina de gimnasio, musculación y cardio. Ejercicios, series, repeticiones, peso, descanso, RIR, RPE, superserie, biserie. Press de banca, sentadilla, peso muerto, dominadas, curl de bíceps. Bicicleta estática, cinta de correr, caminadora, elíptica, máquina de remo, spinning, LISS, HIIT, Zona 2, RPM, cadencia, minutos.",
    });

    let cleanText = response.text || "";
    const hallucinations = [
      "Subtítulos realizados por la comunidad de Amara.org",
      "Subtítulos por la comunidad de Amara.org",
      "Subtítulos realizados por",
      "Subtitulado por",
      "Amara.org"
    ];

    hallucinations.forEach(phrase => {
      const regex = new RegExp(phrase, "gi");
      cleanText = cleanText.replace(regex, "");
    });

    return NextResponse.json({ text: cleanText.trim() });
  } catch (error) {
    console.error("Whisper transcription error:", error);
    return NextResponse.json({ error: error.message || "Error procesando el audio" }, { status: 500 });
  }
}
