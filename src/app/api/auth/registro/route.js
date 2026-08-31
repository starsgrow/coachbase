import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "login",
  "registro",
  "panel",
  "app",
  "www",
  "olympo",
  "static",
  "dashboard",
  "root",
];

export async function POST(req) {
  try {
    const { nombreMarca, slug, email, password, colorPrimario } = await req.json();

    // 1. Validaciones de entrada
    if (!email || !password || !nombreMarca || !slug) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNombreMarca = nombreMarca.trim();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    if (cleanSlug.length < 3) {
      return NextResponse.json(
        { error: "El subdominio debe tener al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (RESERVED_SLUGS.includes(cleanSlug)) {
      return NextResponse.json(
        { error: `El subdominio '${cleanSlug}' está reservado por el sistema. Elige otro.` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // 2. Verificar si el subdominio (slug) ya está registrado en `coaches`
    const { data: existingCoach, error: slugCheckError } = await supabaseServer
      .from("coaches")
      .select("id, slug")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (slugCheckError) {
      console.error("Error verificando slug:", slugCheckError);
      return NextResponse.json(
        { error: "Error de base de datos al validar el subdominio." },
        { status: 500 }
      );
    }

    if (existingCoach) {
      return NextResponse.json(
        { error: `El subdominio '${cleanSlug}' ya está en uso. Por favor elige otro.` },
        { status: 400 }
      );
    }

    // 3. Crear usuario de autenticación en Supabase Auth con confirmación automática
    let userId = null;

    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nombre_marca: cleanNombreMarca,
        slug: cleanSlug,
      },
    });

    if (authError) {
      const isAlreadyRegistered =
        authError.message?.toLowerCase().includes("already registered") ||
        authError.message?.toLowerCase().includes("already exists") ||
        authError.status === 422;

      if (isAlreadyRegistered) {
        // Buscar el usuario existente para verificar si ya tiene coach
        const { data: userListData } = await supabaseServer.auth.admin.listUsers();
        const existingUser = userListData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );

        if (existingUser) {
          const { data: existingUserCoach } = await supabaseServer
            .from("coaches")
            .select("id, slug")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (existingUserCoach) {
            return NextResponse.json(
              { error: "Ya existe una cuenta con este correo electrónico. Inicia sesión en su lugar." },
              { status: 400 }
            );
          }

          // Si el usuario auth quedó huérfano sin registro en `coaches`, actualizamos sus credenciales
          await supabaseServer.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
            user_metadata: {
              nombre_marca: cleanNombreMarca,
              slug: cleanSlug,
            },
          });
          userId = existingUser.id;
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        console.error("Error creando usuario en auth:", authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      userId = authData?.user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No se pudo obtener el identificador de usuario." },
        { status: 500 }
      );
    }

    // 4. Crear registro de coach usando el cliente servidor (bypasses RLS de forma segura)
    const { data: coachRecord, error: coachError } = await supabaseServer
      .from("coaches")
      .insert({
        user_id: userId,
        slug: cleanSlug,
        nombre_marca: cleanNombreMarca,
        color_primario: colorPrimario || "#6366F1",
        plan: "pro",
      })
      .select()
      .single();

    if (coachError) {
      console.error("Error guardando coach en DB:", coachError);
      return NextResponse.json(
        { error: "Usuario creado pero hubo un error al guardar tu perfil de coach: " + coachError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slug: cleanSlug,
      coach: coachRecord,
    });
  } catch (err) {
    console.error("Error en registro API:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor al procesar el registro." },
      { status: 500 }
    );
  }
}
