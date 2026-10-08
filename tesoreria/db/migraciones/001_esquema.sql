-- ═══════════════════════════════════════════════════════════════════════
-- Tesorería de la Red — esquema inicial
--
-- Convenciones
--   · Valores monetarios: BIGINT en centavos de peso colombiano (sin
--     punto flotante). $1.000 = 100000.
--   · Fechas efectivas: DATE (calendario de Colombia). Fechas de registro:
--     TIMESTAMPTZ.
--   · Periodos mensuales: DATE con el primer día del mes.
--   · Permisos en la base de datos: la aplicación ejecuta cada solicitud con
--     SET LOCAL ROLE tes_consulta | tes_tesoreria | tes_auth. Esos roles solo
--     tienen los privilegios concedidos abajo, de modo que un rol de consulta
--     no puede modificar datos aunque la capa web fallara.
-- ═══════════════════════════════════════════════════════════════════════

-- Roles (sin inicio de sesión; la conexión de la app los asume por solicitud)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tes_auth') THEN
    CREATE ROLE tes_auth NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tes_consulta') THEN
    CREATE ROLE tes_consulta NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tes_tesoreria') THEN
    CREATE ROLE tes_tesoreria NOLOGIN;
  END IF;
END $$;

GRANT tes_auth, tes_consulta, tes_tesoreria TO CURRENT_USER;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO tes_auth, tes_consulta, tes_tesoreria;

-- ─── utilidades ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION hoy_co() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'America/Bogota')::date $$;

CREATE OR REPLACE FUNCTION usuario_actual() RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.usuario_id', true), '')::integer
$$;

CREATE OR REPLACE FUNCTION es_primer_dia(d date) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT d IS NULL OR extract(day FROM d) = 1 $$;

-- ─── usuarios y sesiones ────────────────────────────────────────────────
CREATE TABLE usuarios (
  id               serial PRIMARY KEY,
  usuario          text NOT NULL UNIQUE CHECK (usuario ~ '^[a-z0-9._-]{3,40}$'),
  nombre           text NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 120),
  rol              text NOT NULL CHECK (rol IN ('tesoreria', 'consulta')),
  clave_hash       text NOT NULL,
  activo           boolean NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  creado_por       integer REFERENCES usuarios(id),
  ultimo_acceso    timestamptz,
  clave_cambiada_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sesiones (
  id               bigserial PRIMARY KEY,
  token_hash       text NOT NULL UNIQUE,
  usuario_id       integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creada_en        timestamptz NOT NULL DEFAULT now(),
  expira_en        timestamptz NOT NULL,
  ultima_actividad timestamptz NOT NULL DEFAULT now(),
  ip               text,
  agente           text
);
CREATE INDEX ON sesiones (usuario_id);

CREATE TABLE intentos_acceso (
  id      bigserial PRIMARY KEY,
  usuario text,
  ip      text,
  exitoso boolean NOT NULL,
  en      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON intentos_acceso (usuario, en);
CREATE INDEX ON intentos_acceso (ip, en);

CREATE TABLE restablecimientos (
  id          serial PRIMARY KEY,
  usuario_id  integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  creado_por  integer REFERENCES usuarios(id),
  creado_en   timestamptz NOT NULL DEFAULT now(),
  expira_en   timestamptz NOT NULL,
  usado_en    timestamptz
);

-- ─── configuración general (una fila) ───────────────────────────────────
CREATE TABLE configuracion (
  id                     boolean PRIMARY KEY DEFAULT true CHECK (id),
  dia_pago_mensual       integer NOT NULL DEFAULT 10 CHECK (dia_pago_mensual BETWEEN 1 AND 28),
  smmlv                  bigint CHECK (smmlv > 0),          -- centavos; vacío = sin alerta art. 30 c
  smmlv_anio             integer,
  umbral_smmlv_junta     integer NOT NULL DEFAULT 30 CHECK (umbral_smmlv_junta > 0),
  patrimonio_declarado   bigint NOT NULL DEFAULT 1000000000, -- art. 43 par. 2 ($10.000.000), solo informativo
  patrimonio_estado      text NOT NULL DEFAULT 'por_confirmar'
                         CHECK (patrimonio_estado IN ('por_confirmar', 'confirmado')),
  patrimonio_nota        text,
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO configuracion DEFAULT VALUES;

-- ─── catálogos ──────────────────────────────────────────────────────────
CREATE TABLE cuentas (
  id         serial PRIMARY KEY,
  nombre     text NOT NULL CHECK (length(trim(nombre)) > 0),
  tipo       text NOT NULL CHECK (tipo IN ('banco', 'caja', 'otro')),
  entidad    text,
  detalle    text,
  activa     boolean NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cuentas_nombre_unico ON cuentas (lower(trim(nombre)));

CREATE TABLE categorias (
  id      serial PRIMARY KEY,
  nombre  text NOT NULL CHECK (length(trim(nombre)) > 0),
  tipo    text NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  activa  boolean NOT NULL DEFAULT true,
  orden   integer NOT NULL DEFAULT 100
);
CREATE UNIQUE INDEX categorias_nombre_unico ON categorias (tipo, lower(trim(nombre)));

-- Categorías de partida (editables). Son configuración, no datos ficticios.
INSERT INTO categorias (nombre, tipo, orden) VALUES
  ('Constitución', 'egreso', 10),
  ('Funcionamiento', 'egreso', 20),
  ('Comunicaciones', 'egreso', 30),
  ('Encuentros', 'egreso', 40),
  ('Desplazamientos', 'egreso', 50),
  ('Defensa jurídica', 'egreso', 60),
  ('Otros', 'egreso', 90),
  ('Aportes de miembros', 'ingreso', 10),
  ('Donaciones', 'ingreso', 20),
  ('Aportes voluntarios', 'ingreso', 30),
  ('Rendimientos financieros', 'ingreso', 40),
  ('Otros ingresos', 'ingreso', 90);

CREATE TABLE fondos (
  id                 serial PRIMARY KEY,
  nombre             text NOT NULL CHECK (length(trim(nombre)) > 0),
  tipo               text NOT NULL CHECK (tipo IN ('reserva', 'proyecto')),
  descripcion        text,
  referencia_acuerdo text,
  activo             boolean NOT NULL DEFAULT true,
  creado_en          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX fondos_nombre_unico ON fondos (lower(trim(nombre)));

-- ─── miembros ───────────────────────────────────────────────────────────
CREATE TABLE miembros (
  id                 serial PRIMARY KEY,
  codigo             text GENERATED ALWAYS AS ('M-' || lpad(id::text, 4, '0')) STORED UNIQUE,
  nombre             text NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 200),
  tipo_persona       text NOT NULL DEFAULT 'natural' CHECK (tipo_persona IN ('natural', 'organizacion')),
  vinculo            text NOT NULL CHECK (vinculo IN ('asociado', 'aportante', 'otro')),
  clase_asociado     text CHECK (clase_asociado IN ('activo', 'honorario')),
  estado             text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado')),
  fecha_vinculacion  date,
  fecha_retiro       date,
  observaciones      text,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  creado_por         integer REFERENCES usuarios(id),
  CHECK (clase_asociado IS NULL OR vinculo = 'asociado'),
  CHECK (fecha_retiro IS NULL OR fecha_vinculacion IS NULL OR fecha_retiro >= fecha_vinculacion)
);
CREATE UNIQUE INDEX miembros_nombre_unico ON miembros (lower(trim(nombre)));

-- Contacto: tabla aparte, sin permisos para consulta.
CREATE TABLE miembros_contacto (
  miembro_id      integer PRIMARY KEY REFERENCES miembros(id) ON DELETE CASCADE,
  telefono        text,
  correo          text,
  direccion       text,
  otro            text,
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);

-- ─── comprobantes (almacenamiento privado en la base de datos) ─────────
CREATE TABLE comprobantes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_archivo    text NOT NULL,
  tipo_mime         text NOT NULL CHECK (tipo_mime IN ('application/pdf', 'image/jpeg', 'image/png')),
  tamano            integer NOT NULL CHECK (tamano > 0 AND tamano <= 10485760),
  sha256            text NOT NULL,
  contenido         bytea NOT NULL,
  datos_personales  boolean NOT NULL DEFAULT true,
  descripcion       text,
  subido_por        integer REFERENCES usuarios(id),
  subido_en         timestamptz NOT NULL DEFAULT now()
);

-- ─── saldo inicial por cuenta ───────────────────────────────────────────
-- Los movimientos con fecha efectiva igual o anterior a fecha_corte quedan
-- como "históricos": se conservan para el recaudo de compromisos pero NO
-- suman al saldo, porque ya están incluidos en el saldo inicial.
CREATE TABLE saldos_iniciales (
  id                serial PRIMARY KEY,
  cuenta_id         integer NOT NULL REFERENCES cuentas(id),
  fecha_corte       date NOT NULL,
  valor             bigint NOT NULL CHECK (valor >= 0),
  referencia        text NOT NULL CHECK (length(trim(referencia)) > 0),
  comprobante_id    uuid REFERENCES comprobantes(id),
  estado            text NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('confirmado', 'anulado')),
  registrado_por    integer REFERENCES usuarios(id),
  registrado_en     timestamptz NOT NULL DEFAULT now(),
  anulado_por       integer REFERENCES usuarios(id),
  anulado_en        timestamptz,
  motivo_anulacion  text,
  CHECK (estado <> 'confirmado' OR comprobante_id IS NOT NULL),
  CHECK (estado <> 'anulado' OR length(trim(coalesce(motivo_anulacion, ''))) > 0)
);
CREATE UNIQUE INDEX saldo_inicial_unico ON saldos_iniciales (cuenta_id) WHERE estado = 'confirmado';

-- ─── esquemas de aportes ────────────────────────────────────────────────
-- Un esquema en estado "propuesta" NO genera obligaciones. Solo uno
-- "aprobado", con referencia al acuerdo que lo sustenta, admite compromisos.
CREATE TABLE esquemas_aporte (
  id                        serial PRIMARY KEY,
  tipo                      text NOT NULL CHECK (tipo IN ('constitucion', 'mensual')),
  nombre                    text NOT NULL CHECK (length(trim(nombre)) > 0),
  estado                    text NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta', 'aprobado', 'cerrado')),
  organo                    text CHECK (organo IN ('asamblea', 'junta', 'otro')),
  referencia_acuerdo        text,
  fecha_acuerdo             date,
  presupuesto_gastos        bigint CHECK (presupuesto_gastos >= 0),
  meta_gastos               bigint CHECK (meta_gastos >= 0),
  meta_patrimonio           bigint CHECK (meta_patrimonio >= 0),
  dia_pago                  integer CHECK (dia_pago BETWEEN 1 AND 28),
  monto_sugerido            bigint CHECK (monto_sugerido > 0),
  observaciones             text,
  registrado_por            integer REFERENCES usuarios(id),
  registrado_en             timestamptz NOT NULL DEFAULT now(),
  aprobacion_registrada_por integer REFERENCES usuarios(id),
  aprobacion_registrada_en  timestamptz,
  CHECK (estado = 'propuesta' OR (organo IS NOT NULL AND length(trim(coalesce(referencia_acuerdo, ''))) > 0 AND fecha_acuerdo IS NOT NULL))
);
CREATE UNIQUE INDEX esquemas_nombre_unico ON esquemas_aporte (lower(trim(nombre)));

-- Aceptación expresa de una mensualidad por parte de un aportante.
CREATE TABLE adhesiones (
  id                     serial PRIMARY KEY,
  esquema_id             integer NOT NULL REFERENCES esquemas_aporte(id),
  miembro_id             integer NOT NULL REFERENCES miembros(id),
  monto                  bigint NOT NULL CHECK (monto > 0),
  mes_inicio             date NOT NULL CHECK (es_primer_dia(mes_inicio)),
  mes_fin                date CHECK (es_primer_dia(mes_fin)),
  dia_pago               integer CHECK (dia_pago BETWEEN 1 AND 28),
  referencia_aceptacion  text NOT NULL CHECK (length(trim(referencia_aceptacion)) > 0),
  fecha_aceptacion       date NOT NULL,
  observaciones          text,
  registrado_por         integer REFERENCES usuarios(id),
  registrado_en          timestamptz NOT NULL DEFAULT now(),
  CHECK (mes_fin IS NULL OR mes_fin >= mes_inicio)
);

CREATE TABLE compromisos (
  id                serial PRIMARY KEY,
  esquema_id        integer NOT NULL REFERENCES esquemas_aporte(id),
  miembro_id        integer NOT NULL REFERENCES miembros(id),
  tipo              text NOT NULL CHECK (tipo IN ('constitucion', 'mensual')),
  destino           text NOT NULL CHECK (destino IN ('gastos_constitucion', 'patrimonio_inicial', 'sostenimiento')),
  periodo           date CHECK (es_primer_dia(periodo)),
  adhesion_id       integer REFERENCES adhesiones(id),
  monto             bigint NOT NULL CHECK (monto > 0),
  fecha_acordada    date NOT NULL,
  estado            text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'anulado')),
  motivo_anulacion  text,
  observaciones     text,
  registrado_por    integer REFERENCES usuarios(id),
  registrado_en     timestamptz NOT NULL DEFAULT now(),
  CHECK ((tipo = 'mensual') = (destino = 'sostenimiento')),
  CHECK (tipo <> 'mensual' OR (periodo IS NOT NULL AND adhesion_id IS NOT NULL)),
  CHECK (tipo <> 'constitucion' OR periodo IS NULL),
  CHECK (estado <> 'anulado' OR length(trim(coalesce(motivo_anulacion, ''))) > 0)
);
-- Sin duplicados para la misma persona y periodo (o destino de constitución).
CREATE UNIQUE INDEX compromiso_mensual_unico ON compromisos (miembro_id, esquema_id, periodo)
  WHERE tipo = 'mensual' AND estado = 'vigente';
CREATE UNIQUE INDEX compromiso_constitucion_unico ON compromisos (miembro_id, esquema_id, destino)
  WHERE tipo = 'constitucion' AND estado = 'vigente';

-- ─── gastos comprometidos (obligaciones por pagar) ──────────────────────
CREATE TABLE obligaciones (
  id                       serial PRIMARY KEY,
  descripcion              text NOT NULL CHECK (length(trim(descripcion)) > 0),
  tercero                  text,
  categoria_id             integer NOT NULL REFERENCES categorias(id),
  fondo_id                 integer REFERENCES fondos(id),
  monto                    bigint NOT NULL CHECK (monto > 0),
  fecha_compromiso         date NOT NULL,
  fecha_vencimiento        date,
  referencia_autorizacion  text,
  estado                   text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'anulada')),
  motivo_anulacion         text,
  registrado_por           integer REFERENCES usuarios(id),
  registrado_en            timestamptz NOT NULL DEFAULT now(),
  CHECK (estado <> 'anulada' OR length(trim(coalesce(motivo_anulacion, ''))) > 0)
);

-- ─── movimientos ────────────────────────────────────────────────────────
CREATE TABLE movimientos (
  id                       bigserial PRIMARY KEY,
  fecha_efectiva           date NOT NULL,
  tipo                     text NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'traslado')),
  cuenta_id                integer NOT NULL REFERENCES cuentas(id),
  cuenta_destino_id        integer REFERENCES cuentas(id),
  miembro_id               integer REFERENCES miembros(id),
  tercero                  text,
  concepto                 text NOT NULL CHECK (length(trim(concepto)) > 0),
  categoria_id             integer REFERENCES categorias(id),
  valor                    bigint NOT NULL CHECK (valor > 0),
  medio_pago               text,
  fondo_id                 integer REFERENCES fondos(id),
  referencia_autorizacion  text,
  obligacion_id            integer REFERENCES obligaciones(id),
  reembolsa_a              bigint REFERENCES movimientos(id),
  excedente_destino        text CHECK (excedente_destino IN ('saldo_a_favor', 'aporte_adicional')),
  corrige_a                bigint REFERENCES movimientos(id),
  observaciones            text,
  estado                   text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificado', 'anulado')),
  registrado_por           integer REFERENCES usuarios(id),
  registrado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en           timestamptz,
  verificado_por           integer REFERENCES usuarios(id),
  verificado_en            timestamptz,
  anulado_por              integer REFERENCES usuarios(id),
  anulado_en               timestamptz,
  motivo_anulacion         text,
  CHECK ((tipo = 'traslado') = (cuenta_destino_id IS NOT NULL)),
  CHECK (cuenta_destino_id IS NULL OR cuenta_destino_id <> cuenta_id),
  CHECK (tipo = 'traslado' OR categoria_id IS NOT NULL),
  CHECK (tipo <> 'traslado' OR (categoria_id IS NULL AND miembro_id IS NULL AND obligacion_id IS NULL
                                AND reembolsa_a IS NULL AND excedente_destino IS NULL)),
  CHECK (obligacion_id IS NULL OR tipo = 'egreso'),
  CHECK (reembolsa_a IS NULL OR (tipo = 'ingreso' AND reembolsa_a <> id)),
  CHECK (excedente_destino IS NULL OR tipo = 'ingreso'),
  CHECK (estado <> 'verificado' OR verificado_en IS NOT NULL),
  CHECK (estado <> 'anulado' OR length(trim(coalesce(motivo_anulacion, ''))) > 0)
);
CREATE INDEX ON movimientos (fecha_efectiva);
CREATE INDEX ON movimientos (estado);
CREATE INDEX ON movimientos (miembro_id);
CREATE INDEX ON movimientos (obligacion_id);
CREATE INDEX ON movimientos (reembolsa_a);

-- Soportes adjuntos (un movimiento, compromiso, obligación o esquema puede tener varios)
CREATE TABLE soportes (
  id              bigserial PRIMARY KEY,
  comprobante_id  uuid NOT NULL REFERENCES comprobantes(id),
  movimiento_id   bigint REFERENCES movimientos(id),
  compromiso_id   integer REFERENCES compromisos(id),
  obligacion_id   integer REFERENCES obligaciones(id),
  esquema_id      integer REFERENCES esquemas_aporte(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(movimiento_id, compromiso_id, obligacion_id, esquema_id) = 1)
);
CREATE INDEX ON soportes (movimiento_id);
CREATE INDEX ON soportes (compromiso_id);
CREATE INDEX ON soportes (obligacion_id);
CREATE INDEX ON soportes (esquema_id);

-- Distribución de un ingreso entre compromisos (no crea ingresos nuevos).
CREATE TABLE aplicaciones (
  id              bigserial PRIMARY KEY,
  movimiento_id   bigint NOT NULL REFERENCES movimientos(id),
  compromiso_id   integer NOT NULL REFERENCES compromisos(id),
  valor           bigint NOT NULL CHECK (valor > 0),
  registrado_por  integer REFERENCES usuarios(id),
  registrado_en   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movimiento_id, compromiso_id)
);
CREATE INDEX ON aplicaciones (compromiso_id);

-- Asignaciones a reservas: separan recursos ya existentes en caja; no son
-- ingresos ni egresos. Valor positivo reserva, negativo libera.
CREATE TABLE fondo_asignaciones (
  id              serial PRIMARY KEY,
  fondo_id        integer NOT NULL REFERENCES fondos(id),
  fecha           date NOT NULL,
  valor           bigint NOT NULL CHECK (valor <> 0),
  motivo          text NOT NULL CHECK (length(trim(motivo)) > 0),
  referencia      text,
  registrado_por  integer REFERENCES usuarios(id),
  registrado_en   timestamptz NOT NULL DEFAULT now()
);

-- ─── presupuesto ────────────────────────────────────────────────────────
CREATE TABLE presupuesto_anual (
  anio                      integer PRIMARY KEY CHECK (anio BETWEEN 2000 AND 2100),
  estado                    text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobado')),
  referencia_acta           text,
  fecha_aprobacion          date,
  registrado_por            integer REFERENCES usuarios(id),
  actualizado_en            timestamptz NOT NULL DEFAULT now(),
  CHECK (estado <> 'aprobado' OR (length(trim(coalesce(referencia_acta, ''))) > 0 AND fecha_aprobacion IS NOT NULL))
);

CREATE TABLE presupuesto (
  id            serial PRIMARY KEY,
  anio          integer NOT NULL REFERENCES presupuesto_anual(anio),
  mes           integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria_id  integer NOT NULL REFERENCES categorias(id),
  monto         bigint NOT NULL CHECK (monto >= 0),
  UNIQUE (anio, mes, categoria_id)
);

-- ─── cierres mensuales (conciliación) ───────────────────────────────────
CREATE TABLE cierres (
  id                 serial PRIMARY KEY,
  periodo            date NOT NULL CHECK (es_primer_dia(periodo)),
  cuenta_id          integer NOT NULL REFERENCES cuentas(id),
  saldo_calculado    bigint NOT NULL,
  saldo_observado    bigint NOT NULL,
  diferencia         bigint GENERATED ALWAYS AS (saldo_observado - saldo_calculado) STORED,
  explicacion        text,
  pendientes_verificar integer NOT NULL DEFAULT 0,
  sin_soporte        integer NOT NULL DEFAULT 0,
  estado             text NOT NULL DEFAULT 'cerrado' CHECK (estado IN ('cerrado', 'reabierto')),
  cerrado_por        integer REFERENCES usuarios(id),
  cerrado_en         timestamptz NOT NULL DEFAULT now(),
  reabierto_por      integer REFERENCES usuarios(id),
  reabierto_en       timestamptz,
  motivo_reapertura  text,
  UNIQUE (periodo, cuenta_id),
  CHECK (saldo_observado = saldo_calculado OR length(trim(coalesce(explicacion, ''))) > 0),
  CHECK (estado <> 'reabierto' OR length(trim(coalesce(motivo_reapertura, ''))) > 0)
);

-- ─── historial de cambios ───────────────────────────────────────────────
CREATE TABLE historial (
  id           bigserial PRIMARY KEY,
  tabla        text NOT NULL,
  registro_id  text,
  accion       text NOT NULL,
  antes        jsonb,
  despues      jsonb,
  usuario_id   integer,
  en           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON historial (tabla, registro_id);
CREATE INDEX ON historial (en);
