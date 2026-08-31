-- ========================================================
-- ESQUEMA COMPLETO SUPABASE — OLYMPO-COACHES (MULTI-TENANT)
-- Proyecto: Plataforma Marca Blanca para Coaches Fitness
-- Ejecutar en el SQL Editor del NUEVO proyecto Supabase
-- ========================================================

-- --------------------------------------------------------
-- 1. TIPOS ENUM
-- --------------------------------------------------------
CREATE TYPE video_status AS ENUM ('procesando', 'listo', 'error');
CREATE TYPE plan_coach AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE estado_cliente AS ENUM ('activo', 'inactivo', 'pausado');
CREATE TYPE dificultad_ejercicio AS ENUM ('principiante', 'intermedio', 'avanzado');

-- --------------------------------------------------------
-- 2. TABLA DE COACHES (Perfil de Marca / Tenant)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slug TEXT UNIQUE NOT NULL,                    -- Subdominio: carlos → carlos.olympo.pro
  nombre_marca TEXT NOT NULL,                   -- "Carlos Fitness", "FitJuan Training"
  descripcion_corta TEXT,                       -- Bio corta para el hero del tenant
  logo_url TEXT,                                -- URL del logo personalizado
  foto_perfil_url TEXT,                         -- Foto del coach
  color_primario TEXT DEFAULT '#6366F1',        -- Color principal de la marca
  color_secundario TEXT DEFAULT '#0F172A',      -- Color secundario / fondo
  plan plan_coach DEFAULT 'pro',
  email_contacto TEXT,                          -- Email público de contacto
  instagram TEXT,                               -- @handle de Instagram
  whatsapp TEXT,                                -- Número de WhatsApp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------
-- 3. TABLA DE CLIENTES / ALUMNOS POR COACH
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL si aún no tiene cuenta
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  notas TEXT,                                   -- Notas privadas del coach sobre el cliente
  estado estado_cliente DEFAULT 'activo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, email)                       -- Un email único por coach
);

-- --------------------------------------------------------
-- 4. TABLA DE EJERCICIOS (Globales + Personalizados)
-- --------------------------------------------------------
-- coach_id = NULL → ejercicio global disponible para TODOS los coaches
-- coach_id = UUID → ejercicio personalizado de ese coach específico
CREATE TABLE IF NOT EXISTS coach_ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,  -- NULL = ejercicio global
  nombre TEXT NOT NULL,
  slug TEXT,                                    -- URL-friendly: "press-banca-plano"
  grupo_muscular TEXT NOT NULL,                 -- "Pecho", "Espalda", "Piernas", etc.
  musculos_secundarios TEXT[],                  -- {"Tríceps", "Hombro anterior"}
  equipamiento TEXT,                            -- "Barra", "Mancuernas", "Máquina", "Peso corporal"
  dificultad dificultad_ejercicio DEFAULT 'intermedio',
  descripcion TEXT,                             -- Instrucciones de ejecución
  beneficios TEXT[],                            -- Lista de beneficios
  errores_comunes TEXT[],                       -- Errores típicos a evitar
  gif_url TEXT,                                 -- URL del GIF demostrativo
  video_demo_url TEXT,                          -- URL de video (Bunny CDN u otro)
  thumbnail_url TEXT,                           -- Miniatura estática
  es_publico BOOLEAN DEFAULT true,              -- Si otros coaches pueden ver este ejercicio
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------
-- 5. TABLA DE VIDEOS DE LA COMUNIDAD (Bunny Stream)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  bunny_video_id TEXT UNIQUE,
  titulo TEXT NOT NULL,
  categoria TEXT DEFAULT 'tutorial',            -- 'tutorial', 'rutina', 'nutricion', 'comunidad'
  descripcion TEXT,
  solo_premium BOOLEAN DEFAULT false,

  -- URLs procesadas automáticamente via Webhook de Bunny
  url_stream TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,

  -- Estado y manejo de errores
  estado video_status DEFAULT 'procesando',
  error_detalle TEXT,

  vistas INTEGER DEFAULT 0,
  duracion_segundos INTEGER,                    -- Duración del video en segundos
  created_at TIMESTAMPTZ DEFAULT now(),
  procesado_en TIMESTAMPTZ
);

-- --------------------------------------------------------
-- 6. TABLA DE RUTINAS ASIGNADAS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS coach_rutinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES coach_clientes(id) ON DELETE CASCADE,  -- NULL = rutina plantilla
  nombre_rutina TEXT NOT NULL,
  descripcion TEXT,
  dias_semana INTEGER DEFAULT 4,
  nivel TEXT DEFAULT 'intermedio',              -- 'principiante', 'intermedio', 'avanzado'
  objetivo TEXT,                                -- 'hipertrofia', 'fuerza', 'resistencia', 'pérdida de grasa'
  estructura_json JSONB NOT NULL,               -- Rutina completa en JSON
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- ÍNDICES DE RENDIMIENTO
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_coaches_slug ON coaches(slug);
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_clientes_coach ON coach_clientes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clientes_email ON coach_clientes(email);
CREATE INDEX IF NOT EXISTS idx_coach_ejercicios_coach ON coach_ejercicios(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_ejercicios_grupo ON coach_ejercicios(grupo_muscular);
CREATE INDEX IF NOT EXISTS idx_coach_ejercicios_slug ON coach_ejercicios(slug);
CREATE INDEX IF NOT EXISTS idx_coach_videos_coach ON coach_videos(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_videos_estado ON coach_videos(estado);
CREATE INDEX IF NOT EXISTS idx_coach_rutinas_coach ON coach_rutinas(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_rutinas_cliente ON coach_rutinas(cliente_id);

-- ========================================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ========================================================

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_rutinas ENABLE ROW LEVEL SECURITY;

-- ---- COACHES ----
-- El coach puede ver y editar su propia información
CREATE POLICY "coach_manage_own" ON coaches
  FOR ALL USING (auth.uid() = user_id);

-- Cualquiera puede leer el perfil público de un coach (para renderizar el tenant)
CREATE POLICY "public_read_coach" ON coaches
  FOR SELECT USING (true);

-- ---- CLIENTES ----
-- El coach puede gestionar sus propios clientes
CREATE POLICY "coach_manage_clients" ON coach_clientes
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- Un cliente puede ver su propio registro
CREATE POLICY "client_read_own" ON coach_clientes
  FOR SELECT USING (user_id = auth.uid());

-- ---- EJERCICIOS ----
-- Lectura: ejercicios globales (coach_id IS NULL) + propios del coach autenticado
CREATE POLICY "read_exercises" ON coach_ejercicios
  FOR SELECT USING (
    coach_id IS NULL
    OR es_publico = true
    OR coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- El coach puede crear/editar/borrar sus propios ejercicios
CREATE POLICY "coach_manage_exercises" ON coach_ejercicios
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- ---- VIDEOS ----
-- El coach puede gestionar sus propios videos
CREATE POLICY "coach_manage_videos" ON coach_videos
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- Los clientes pueden ver videos listos de su coach
CREATE POLICY "client_read_videos" ON coach_videos
  FOR SELECT USING (estado = 'listo');

-- ---- RUTINAS ----
-- El coach puede gestionar rutinas que creó
CREATE POLICY "coach_manage_routines" ON coach_rutinas
  FOR ALL USING (
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  );

-- El cliente puede ver sus propias rutinas asignadas
CREATE POLICY "client_read_routines" ON coach_rutinas
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM coach_clientes WHERE user_id = auth.uid())
  );

-- ========================================================
-- FUNCIÓN RPC: Estadísticas del Coach (para el Panel)
-- ========================================================
CREATE OR REPLACE FUNCTION get_coach_stats(coach_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_clientes', (SELECT COUNT(*) FROM coach_clientes WHERE coach_id = coach_uuid AND estado = 'activo'),
    'total_videos', (SELECT COUNT(*) FROM coach_videos WHERE coach_id = coach_uuid AND estado = 'listo'),
    'total_videos_procesando', (SELECT COUNT(*) FROM coach_videos WHERE coach_id = coach_uuid AND estado = 'procesando'),
    'total_rutinas', (SELECT COUNT(*) FROM coach_rutinas WHERE coach_id = coach_uuid AND activa = true),
    'total_ejercicios_propios', (SELECT COUNT(*) FROM coach_ejercicios WHERE coach_id = coach_uuid)
  ) INTO result;
  RETURN result;
END;
$$;

-- ========================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaches_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER coach_clientes_updated_at
  BEFORE UPDATE ON coach_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER coach_rutinas_updated_at
  BEFORE UPDATE ON coach_rutinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- TRIGGER: Creación automática de perfil Coach al registrarse (Opcional/Fallback)
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_coach()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'slug' IS NOT NULL THEN
    INSERT INTO public.coaches (user_id, slug, nombre_marca, color_primario, plan)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'slug',
      COALESCE(NEW.raw_user_meta_data->>'nombre_marca', 'Mi App Fitness'),
      COALESCE(NEW.raw_user_meta_data->>'color_primario', '#6366F1'),
      'pro'
    )
    ON CONFLICT (slug) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_coach();
