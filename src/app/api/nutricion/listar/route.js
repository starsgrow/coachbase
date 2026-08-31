import { authenticateApiRequest } from "@/lib/supabaseAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const auth = await authenticateApiRequest(req);
    if (!auth || !auth.coach) {
      return NextResponse.json({ error: "No autorizado o sesión inválida" }, { status: 401 });
    }

    const coach_id = auth.coach.id;
    let planes = [];

    try {
      const { data, error } = await supabaseServer
        .from("coach_planes_alimentacion")
        .select("*, coach_clientes(nombre, email)")
        .eq("coach_id", coach_id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        planes = data;
      }
    } catch (e) {
      planes = [];
    }

    return NextResponse.json({
      success: true,
      planes,
    });
  } catch (err) {
    console.error("Error listando planes de alimentacion:", err);
    return NextResponse.json(
      { error: err.message || "Error al listar los planes de alimentación" },
      { status: 500 }
    );
  }
}
