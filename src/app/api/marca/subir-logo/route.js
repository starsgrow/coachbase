import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req) {
  const auth = await authenticateApiRequest(req);

  if (!auth || !auth.coach) {
    return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
  }

  const coachId = auth.coach.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No se proporcionó ningún archivo de imagen válido" }, { status: 400 });
    }

    const fileType = file.type || "image/png";
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return NextResponse.json(
        { error: "Formato no permitido. Sube una imagen PNG, JPG, WEBP o SVG." },
        { status: 400 }
      );
    }

    // Tamaño máximo: 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máximo 5MB)" }, { status: 400 });
    }

    const bucketName = "logos";

    // 1. Asegurar que el bucket 'logos' exista y sea público
    const { data: buckets } = await supabaseServer.storage.listBuckets();
    const bucketExists = (buckets || []).some((b) => b.name === bucketName);

    if (!bucketExists) {
      const { error: bucketError } = await supabaseServer.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: maxSizeBytes,
        allowedMimeTypes: allowedTypes,
      });
      if (bucketError && !bucketError.message?.includes("already exists")) {
        console.warn("Aviso al crear bucket logos:", bucketError.message);
      }
    }

    // 2. Extraer extensión y preparar nombre único
    let extension = "png";
    if (fileType.includes("jpeg") || fileType.includes("jpg")) extension = "jpg";
    else if (fileType.includes("webp")) extension = "webp";
    else if (fileType.includes("svg")) extension = "svg";

    const fileName = `${coachId}/logo-${Date.now()}.${extension}`;

    // 3. Convertir File a ArrayBuffer / Buffer para Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 4. Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: fileType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error en Supabase Storage upload:", uploadError);
      throw uploadError;
    }

    // 5. Obtener URL pública directa
    const { data: publicUrlData } = supabaseServer.storage.from(bucketName).getPublicUrl(fileName);
    const logoUrl = publicUrlData?.publicUrl;

    if (!logoUrl) {
      throw new Error("No se pudo obtener la URL pública del logotipo");
    }

    // 6. Actualizar automáticamente en la tabla coaches
    const { error: dbError } = await supabaseServer
      .from("coaches")
      .update({ logo_url: logoUrl })
      .eq("id", coachId);

    if (dbError) {
      console.warn("Aviso al actualizar logo_url en coaches:", dbError.message);
    }

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      fileName,
    });
  } catch (err) {
    console.error("Error subiendo logotipo a Supabase Storage:", err);
    return NextResponse.json(
      { error: "Error al subir logotipo", details: err.message },
      { status: 500 }
    );
  }
}
