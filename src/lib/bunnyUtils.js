import { createClient } from "@supabase/supabase-js";

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Obtiene o crea automáticamente una Colección (carpeta) en Bunny Stream para un Coach específico.
 * @param {string} coachId - UUID o ID del coach
 * @returns {Promise<string|null>} - GUID de la colección en Bunny Stream o null
 */
export async function getOrCreateCoachCollection(coachId) {
  if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID || !coachId || coachId.startsWith("demo-")) {
    return null;
  }

  try {
    // 1. Consultar si el coach ya tiene asignada una colección en Supabase
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select("id, slug, nombre_marca, bunny_collection_id")
      .eq("id", coachId)
      .maybeSingle();

    if (coachError) {
      console.error("Error consultando coach para Bunny Collection:", coachError.message);
    }

    if (coach?.bunny_collection_id) {
      return coach.bunny_collection_id;
    }

    const collectionName = coach?.nombre_marca || `Coach ${coach?.slug || coachId.slice(0, 8)}`;

    // 2. Crear nueva Colección en la API de Bunny Stream con timeout/fallback
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/collections`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: collectionName }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (bunnyRes.ok) {
      const collectionData = await bunnyRes.json();
      if (collectionData?.guid) {
        const collectionId = collectionData.guid;

        // 3. Guardar el ID de la colección en Supabase si la columna existe
        try {
          await supabase
            .from("coaches")
            .update({ bunny_collection_id: collectionId })
            .eq("id", coachId);
        } catch (dbErr) {
          console.warn("No se pudo guardar bunny_collection_id en Supabase:", dbErr.message);
        }

        return collectionId;
      }
    }

    return null;
  } catch (err) {
    console.error("Excepción/red al crear colección en Bunny:", err.message);
    return null;
  }
}
