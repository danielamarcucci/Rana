-- ═══════════════════════════════════════════════════════════════════════
-- Reglas de integridad, historial, vistas y permisos
-- ═══════════════════════════════════════════════════════════════════════

-- ─── historial de cambios (auditoría) ───────────────────────────────────
-- Se ejecuta como propietario (SECURITY DEFINER): ningún rol de la app puede
-- escribir ni borrar el historial directamente.
CREATE OR REPLACE FUNCTION tg_historial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_antes   jsonb;
  v_despues jsonb;
  v_id      text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_antes := to_jsonb(OLD) - 'clave_hash' - 'contenido' - 'token_hash';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_despues := to_jsonb(NEW) - 'clave_hash' - 'contenido' - 'token_hash';
  END IF;
  -- El último acceso se actualiza en cada inicio de sesión: no es un cambio a auditar.
  IF TG_OP = 'UPDATE' AND (v_antes - 'ultimo_acceso') = (v_despues - 'ultimo_acceso') THEN
    RETURN NEW;
  END IF;
  v_id := coalesce(v_despues ->> 'id', v_antes ->> 'id',
                   v_despues ->> 'miembro_id', v_antes ->> 'miembro_id');
  INSERT INTO historial (tabla, registro_id, accion, antes, despues, usuario_id)
  VALUES (TG_TABLE_NAME, v_id, lower(TG_OP), v_antes, v_despues, usuario_actual());
  RETURN coalesce(NEW, OLD);
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'configuracion', 'cuentas', 'categorias', 'fondos', 'miembros',
    'miembros_contacto', 'comprobantes', 'saldos_iniciales', 'esquemas_aporte',
    'adhesiones', 'compromisos', 'obligaciones', 'movimientos', 'soportes',
    'aplicaciones', 'fondo_asignaciones', 'presupuesto_anual', 'presupuesto', 'cierres'
  ] LOOP
    EXECUTE format('CREATE TRIGGER historial_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
                    FOR EACH ROW EXECUTE FUNCTION tg_historial()', t);
  END LOOP;
END $$;

-- ─── periodo cerrado ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION periodo_cerrado(p_cuenta integer, p_fecha date) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM cierres
    WHERE cuenta_id = p_cuenta
      AND periodo = date_trunc('month', p_fecha)::date
      AND estado = 'cerrado'
  )
$$;

-- ─── movimientos: inmutabilidad de lo verificado ────────────────────────
CREATE OR REPLACE FUNCTION tg_movimientos_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_total bigint;
  v_ref   record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado <> 'pendiente' THEN
      RAISE EXCEPTION 'Un movimiento verificado o anulado no se puede borrar. Use la anulación con motivo.'
        USING ERRCODE = 'P0001';
    END IF;
    IF periodo_cerrado(OLD.cuenta_id, OLD.fecha_efectiva)
       OR (OLD.cuenta_destino_id IS NOT NULL AND periodo_cerrado(OLD.cuenta_destino_id, OLD.fecha_efectiva)) THEN
      RAISE EXCEPTION 'El mes de este movimiento está cerrado. Reabra el cierre para modificarlo.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'anulado' THEN
      RAISE EXCEPTION 'Un movimiento anulado no se puede modificar.' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.estado = 'verificado' THEN
      -- Solo se permite anular, sin tocar ningún otro dato.
      IF NEW.estado <> 'anulado'
         OR (to_jsonb(NEW) - ARRAY['estado','anulado_por','anulado_en','motivo_anulacion','actualizado_en'])
            IS DISTINCT FROM
            (to_jsonb(OLD) - ARRAY['estado','anulado_por','anulado_en','motivo_anulacion','actualizado_en']) THEN
        RAISE EXCEPTION 'Un movimiento verificado no se puede editar: anúlelo con motivo o regístrelo como corrección.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    IF NEW.estado = 'anulado' AND OLD.estado <> 'anulado' THEN
      NEW.anulado_en := now();
      NEW.anulado_por := usuario_actual();
    END IF;
    IF NEW.estado = 'verificado' AND OLD.estado = 'pendiente' THEN
      NEW.verificado_en := now();
      NEW.verificado_por := usuario_actual();
    END IF;
    NEW.actualizado_en := now();
    NEW.registrado_por := OLD.registrado_por;
    NEW.registrado_en := OLD.registrado_en;
    IF periodo_cerrado(OLD.cuenta_id, OLD.fecha_efectiva)
       OR (OLD.cuenta_destino_id IS NOT NULL AND periodo_cerrado(OLD.cuenta_destino_id, OLD.fecha_efectiva)) THEN
      RAISE EXCEPTION 'El mes de este movimiento está cerrado. Reabra el cierre para modificarlo.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
    NEW.registrado_en := now();
    IF NEW.estado = 'verificado' THEN
      NEW.verificado_en := now();
      NEW.verificado_por := usuario_actual();
    ELSIF NEW.estado = 'anulado' THEN
      RAISE EXCEPTION 'No se puede registrar un movimiento ya anulado.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF periodo_cerrado(NEW.cuenta_id, NEW.fecha_efectiva)
     OR (NEW.cuenta_destino_id IS NOT NULL AND periodo_cerrado(NEW.cuenta_destino_id, NEW.fecha_efectiva)) THEN
    RAISE EXCEPTION 'El mes % está cerrado para esta cuenta. Reabra el cierre (con motivo) para registrar o modificar movimientos.',
      to_char(NEW.fecha_efectiva, 'MM/YYYY') USING ERRCODE = 'P0001';
  END IF;

  -- Un reembolso hereda la categoría y el fondo del egreso original, para
  -- descontarse de ese gasto (no se cuenta como ingreso nuevo).
  IF NEW.reembolsa_a IS NOT NULL THEN
    SELECT categoria_id, fondo_id INTO NEW.categoria_id, NEW.fondo_id FROM movimientos WHERE id = NEW.reembolsa_a;
  ELSIF NEW.categoria_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM categorias WHERE id = NEW.categoria_id AND tipo = NEW.tipo) THEN
    RAISE EXCEPTION 'La categoría no corresponde al tipo de movimiento.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.estado <> 'anulado' THEN
    -- Pagos de un gasto comprometido: no pueden superar su valor.
    IF NEW.obligacion_id IS NOT NULL THEN
      SELECT * INTO v_ref FROM obligaciones WHERE id = NEW.obligacion_id FOR UPDATE;
      IF v_ref.estado <> 'vigente' THEN
        RAISE EXCEPTION 'El gasto comprometido está anulado.' USING ERRCODE = 'P0001';
      END IF;
      SELECT coalesce(sum(valor), 0) INTO v_total FROM movimientos
       WHERE obligacion_id = NEW.obligacion_id AND estado <> 'anulado' AND id <> NEW.id;
      IF v_total + NEW.valor > v_ref.monto THEN
        RAISE EXCEPTION 'Los pagos (%) superarían el valor del gasto comprometido (%).',
          (v_total + NEW.valor) / 100, v_ref.monto / 100 USING ERRCODE = 'P0001';
      END IF;
    END IF;
    -- Reembolsos: no pueden superar el egreso que los originó.
    IF NEW.reembolsa_a IS NOT NULL THEN
      SELECT * INTO v_ref FROM movimientos WHERE id = NEW.reembolsa_a FOR UPDATE;
      IF v_ref.tipo <> 'egreso' OR v_ref.estado = 'anulado' THEN
        RAISE EXCEPTION 'Un reembolso debe referirse a un egreso no anulado.' USING ERRCODE = 'P0001';
      END IF;
      SELECT coalesce(sum(valor), 0) INTO v_total FROM movimientos
       WHERE reembolsa_a = NEW.reembolsa_a AND estado <> 'anulado' AND id <> NEW.id;
      IF v_total + NEW.valor > v_ref.valor THEN
        RAISE EXCEPTION 'Los reembolsos superarían el valor del egreso original.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    -- Las aplicaciones a compromisos no pueden superar el valor recibido.
    IF TG_OP = 'UPDATE' THEN
      SELECT coalesce(sum(valor), 0) INTO v_total FROM aplicaciones WHERE movimiento_id = NEW.id;
      IF v_total > NEW.valor THEN
        RAISE EXCEPTION 'El valor no puede ser menor que lo ya distribuido entre compromisos (%).', v_total / 100
          USING ERRCODE = 'P0001';
      END IF;
      IF v_total > 0 AND NEW.tipo <> 'ingreso' THEN
        RAISE EXCEPTION 'Este movimiento tiene pagos de compromisos distribuidos; debe seguir siendo un ingreso.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER movimientos_guardia BEFORE INSERT OR UPDATE OR DELETE ON movimientos
FOR EACH ROW EXECUTE FUNCTION tg_movimientos_guardia();

-- ─── aplicaciones: sin superar lo recibido ni lo comprometido ───────────
CREATE OR REPLACE FUNCTION tg_aplicaciones_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_mov   record;
  v_comp  record;
  v_total bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_mov FROM movimientos WHERE id = OLD.movimiento_id;
    IF v_mov.estado = 'anulado' THEN
      RAISE EXCEPTION 'No se modifican las distribuciones de un movimiento anulado (se conservan como historial).'
        USING ERRCODE = 'P0001';
    END IF;
    IF periodo_cerrado(v_mov.cuenta_id, v_mov.fecha_efectiva) THEN
      RAISE EXCEPTION 'El mes de este ingreso está cerrado.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  SELECT * INTO v_mov FROM movimientos WHERE id = NEW.movimiento_id FOR UPDATE;
  IF v_mov.tipo <> 'ingreso' OR v_mov.reembolsa_a IS NOT NULL THEN
    RAISE EXCEPTION 'Solo los ingresos (que no sean reembolsos) se pueden distribuir entre compromisos.' USING ERRCODE = 'P0001';
  END IF;
  IF v_mov.estado = 'anulado' THEN
    RAISE EXCEPTION 'El ingreso está anulado.' USING ERRCODE = 'P0001';
  END IF;
  IF periodo_cerrado(v_mov.cuenta_id, v_mov.fecha_efectiva) THEN
    RAISE EXCEPTION 'El mes de este ingreso está cerrado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_comp FROM compromisos WHERE id = NEW.compromiso_id FOR UPDATE;
  IF v_comp.estado <> 'vigente' THEN
    RAISE EXCEPTION 'El compromiso está anulado.' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(sum(valor), 0) INTO v_total FROM aplicaciones
   WHERE movimiento_id = NEW.movimiento_id AND id IS DISTINCT FROM NEW.id;
  IF v_total + NEW.valor > v_mov.valor THEN
    RAISE EXCEPTION 'La distribución (%) supera el valor recibido (%).',
      (v_total + NEW.valor) / 100, v_mov.valor / 100 USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(sum(a.valor), 0) INTO v_total
    FROM aplicaciones a JOIN movimientos m ON m.id = a.movimiento_id
   WHERE a.compromiso_id = NEW.compromiso_id AND m.estado <> 'anulado' AND a.id IS DISTINCT FROM NEW.id;
  IF v_total + NEW.valor > v_comp.monto THEN
    RAISE EXCEPTION 'El abono supera el saldo del compromiso. Registre el excedente como saldo a favor o aporte adicional.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
  RETURN NEW;
END $$;

CREATE TRIGGER aplicaciones_guardia BEFORE INSERT OR UPDATE OR DELETE ON aplicaciones
FOR EACH ROW EXECUTE FUNCTION tg_aplicaciones_guardia();

-- ─── compromisos: solo de esquemas aprobados ────────────────────────────
CREATE OR REPLACE FUNCTION tg_compromisos_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_esq   record;
  v_adh   record;
  v_total bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los compromisos no se borran; se anulan con motivo.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_esq FROM esquemas_aporte WHERE id = NEW.esquema_id;
  IF TG_OP = 'INSERT' OR NEW.monto <> OLD.monto OR NEW.miembro_id <> OLD.miembro_id THEN
    IF v_esq.estado <> 'aprobado' THEN
      RAISE EXCEPTION 'El esquema "%" no está aprobado: una propuesta no genera compromisos de aporte.', v_esq.nombre
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF v_esq.tipo <> NEW.tipo THEN
    RAISE EXCEPTION 'El tipo del compromiso no coincide con el del esquema.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.tipo = 'mensual' THEN
    SELECT * INTO v_adh FROM adhesiones WHERE id = NEW.adhesion_id;
    IF v_adh.miembro_id <> NEW.miembro_id OR v_adh.esquema_id <> NEW.esquema_id
       OR NEW.periodo < v_adh.mes_inicio OR (v_adh.mes_fin IS NOT NULL AND NEW.periodo > v_adh.mes_fin) THEN
      RAISE EXCEPTION 'El periodo % no está cubierto por la aceptación registrada del aportante.',
        to_char(NEW.periodo, 'MM/YYYY') USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'anulado' THEN
      RAISE EXCEPTION 'Un compromiso anulado no se modifica.' USING ERRCODE = 'P0001';
    END IF;
    SELECT coalesce(sum(a.valor), 0) INTO v_total
      FROM aplicaciones a JOIN movimientos m ON m.id = a.movimiento_id
     WHERE a.compromiso_id = NEW.id AND m.estado <> 'anulado';
    IF NEW.estado = 'anulado' AND v_total > 0 THEN
      RAISE EXCEPTION 'El compromiso tiene abonos. Primero retire o reasigne esos abonos.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.monto < v_total THEN
      RAISE EXCEPTION 'El monto no puede ser menor que lo ya abonado (%).', v_total / 100 USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER compromisos_guardia BEFORE INSERT OR UPDATE OR DELETE ON compromisos
FOR EACH ROW EXECUTE FUNCTION tg_compromisos_guardia();

-- Un esquema aprobado no vuelve a "propuesta" si ya tiene compromisos.
CREATE OR REPLACE FUNCTION tg_esquemas_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los esquemas de aportes no se borran; ciérrelos.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tipo <> OLD.tipo THEN
      RAISE EXCEPTION 'El tipo de esquema no se puede cambiar.' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.estado <> 'propuesta' AND NEW.estado = 'propuesta'
       AND EXISTS (SELECT 1 FROM compromisos WHERE esquema_id = OLD.id) THEN
      RAISE EXCEPTION 'El esquema ya tiene compromisos; no puede volver a propuesta.' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.estado = 'propuesta' AND NEW.estado = 'aprobado' THEN
      NEW.aprobacion_registrada_por := usuario_actual();
      NEW.aprobacion_registrada_en := now();
    END IF;
  ELSE
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
    IF NEW.estado = 'aprobado' THEN
      NEW.aprobacion_registrada_por := usuario_actual();
      NEW.aprobacion_registrada_en := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER esquemas_guardia BEFORE INSERT OR UPDATE OR DELETE ON esquemas_aporte
FOR EACH ROW EXECUTE FUNCTION tg_esquemas_guardia();

-- Adhesiones: sin solapamiento para la misma persona y esquema.
CREATE OR REPLACE FUNCTION tg_adhesiones_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_esq record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM compromisos WHERE adhesion_id = OLD.id) THEN
      RAISE EXCEPTION 'La aceptación ya generó compromisos; registre una fecha de finalización en lugar de borrarla.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  SELECT * INTO v_esq FROM esquemas_aporte WHERE id = NEW.esquema_id;
  IF v_esq.tipo <> 'mensual' THEN
    RAISE EXCEPTION 'Las aceptaciones solo aplican a esquemas de aporte mensual.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM adhesiones a
     WHERE a.miembro_id = NEW.miembro_id AND a.esquema_id = NEW.esquema_id AND a.id <> NEW.id
       AND daterange(a.mes_inicio, coalesce(a.mes_fin, 'infinity'::date), '[]')
           && daterange(NEW.mes_inicio, coalesce(NEW.mes_fin, 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'Ya existe una aceptación de este aportante para ese esquema en meses que se cruzan.'
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM compromisos c WHERE c.adhesion_id = NEW.id AND c.estado = 'vigente'
      AND (c.periodo < NEW.mes_inicio OR (NEW.mes_fin IS NOT NULL AND c.periodo > NEW.mes_fin))
  ) THEN
    RAISE EXCEPTION 'Hay compromisos generados fuera del nuevo rango de meses; anúlelos primero.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER adhesiones_guardia BEFORE INSERT OR UPDATE OR DELETE ON adhesiones
FOR EACH ROW EXECUTE FUNCTION tg_adhesiones_guardia();

-- Obligaciones: no se borran; anularlas exige que no tengan pagos.
CREATE OR REPLACE FUNCTION tg_obligaciones_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_total bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los gastos comprometidos no se borran; se anulan con motivo.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'anulada' THEN
      RAISE EXCEPTION 'Un gasto comprometido anulado no se modifica.' USING ERRCODE = 'P0001';
    END IF;
    SELECT coalesce(sum(valor), 0) INTO v_total FROM movimientos
     WHERE obligacion_id = NEW.id AND estado <> 'anulado';
    IF NEW.estado = 'anulada' AND v_total > 0 THEN
      RAISE EXCEPTION 'Tiene pagos registrados; anule primero esos pagos.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.monto < v_total THEN
      RAISE EXCEPTION 'El valor no puede ser menor que lo ya pagado.' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER obligaciones_guardia BEFORE INSERT OR UPDATE OR DELETE ON obligaciones
FOR EACH ROW EXECUTE FUNCTION tg_obligaciones_guardia();

-- Registros que solo se agregan (nunca se editan ni borran).
CREATE OR REPLACE FUNCTION tg_solo_agregar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Este registro no se puede modificar ni borrar (%); registre un ajuste.', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END $$;
CREATE TRIGGER fondo_asignaciones_inmutables BEFORE UPDATE OR DELETE ON fondo_asignaciones
FOR EACH ROW EXECUTE FUNCTION tg_solo_agregar();

-- Comprobantes: el contenido no cambia; solo se puede ajustar la marca de
-- datos personales y la descripción. No se borran si soportan algo verificado.
CREATE OR REPLACE FUNCTION tg_comprobantes_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.contenido IS DISTINCT FROM OLD.contenido OR NEW.sha256 <> OLD.sha256
       OR NEW.tipo_mime <> OLD.tipo_mime OR NEW.tamano <> OLD.tamano THEN
      RAISE EXCEPTION 'El archivo de un comprobante no se reemplaza; cargue uno nuevo.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM saldos_iniciales WHERE comprobante_id = OLD.id)
     OR EXISTS (SELECT 1 FROM soportes s JOIN movimientos m ON m.id = s.movimiento_id
                WHERE s.comprobante_id = OLD.id AND m.estado <> 'pendiente') THEN
    RAISE EXCEPTION 'Este comprobante soporta un registro verificado y no se puede borrar.' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER comprobantes_guardia BEFORE UPDATE OR DELETE ON comprobantes
FOR EACH ROW EXECUTE FUNCTION tg_comprobantes_guardia();

CREATE OR REPLACE FUNCTION tg_soportes_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM movimientos WHERE id = OLD.movimiento_id AND estado <> 'pendiente') THEN
    RAISE EXCEPTION 'No se retiran soportes de un movimiento verificado o anulado.' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER soportes_guardia BEFORE UPDATE OR DELETE ON soportes
FOR EACH ROW EXECUTE FUNCTION tg_soportes_guardia();

-- Saldos iniciales: solo se anulan (con motivo), no se editan.
CREATE OR REPLACE FUNCTION tg_saldos_iniciales_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un saldo inicial no se borra; anúlelo con motivo.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'anulado'
       OR (to_jsonb(NEW) - ARRAY['estado','anulado_por','anulado_en','motivo_anulacion'])
          IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['estado','anulado_por','anulado_en','motivo_anulacion']) THEN
      RAISE EXCEPTION 'Un saldo inicial no se edita; anúlelo con motivo y registre uno nuevo.' USING ERRCODE = 'P0001';
    END IF;
    NEW.anulado_por := usuario_actual();
    NEW.anulado_en := now();
  ELSE
    NEW.registrado_por := coalesce(usuario_actual(), NEW.registrado_por);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER saldos_iniciales_guardia BEFORE INSERT OR UPDATE OR DELETE ON saldos_iniciales
FOR EACH ROW EXECUTE FUNCTION tg_saldos_iniciales_guardia();

-- Cierres: no se borran; se reabren con motivo.
CREATE OR REPLACE FUNCTION tg_cierres_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Un cierre no se borra; se reabre con motivo.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.estado = 'reabierto' AND OLD.estado = 'cerrado' THEN
      NEW.reabierto_por := usuario_actual();
      NEW.reabierto_en := now();
    ELSIF NEW.estado = 'cerrado' AND OLD.estado = 'reabierto' THEN
      NEW.cerrado_por := usuario_actual();
      NEW.cerrado_en := now();
    END IF;
  ELSE
    NEW.cerrado_por := coalesce(usuario_actual(), NEW.cerrado_por);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cierres_guardia BEFORE INSERT OR UPDATE OR DELETE ON cierres
FOR EACH ROW EXECUTE FUNCTION tg_cierres_guardia();

-- Usuarios: siempre debe quedar al menos una cuenta de tesorería activa.
CREATE OR REPLACE FUNCTION tg_usuarios_guardia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Las cuentas no se borran; se desactivan.' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.rol = 'tesoreria' AND OLD.activo AND (NOT NEW.activo OR NEW.rol <> 'tesoreria')
     AND NOT EXISTS (SELECT 1 FROM usuarios WHERE rol = 'tesoreria' AND activo AND id <> OLD.id) THEN
    RAISE EXCEPTION 'Debe quedar al menos una cuenta de tesorería activa.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER usuarios_guardia BEFORE UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION tg_usuarios_guardia();

-- ═══════════════════════════════════════════════════════════════════════
-- Vistas de cálculo
-- ═══════════════════════════════════════════════════════════════════════

-- Corte del saldo inicial confirmado de cada cuenta.
CREATE VIEW v_cortes AS
SELECT c.id AS cuenta_id, s.fecha_corte, coalesce(s.valor, 0) AS saldo_inicial, s.id AS saldo_inicial_id
  FROM cuentas c
  LEFT JOIN saldos_iniciales s ON s.cuenta_id = c.id AND s.estado = 'confirmado';

-- Efecto de cada movimiento en cada cuenta (un traslado tiene dos patas).
-- "historico" = fecha efectiva en o antes del corte del saldo inicial: ya
-- está incluido en ese saldo y no vuelve a sumarse.
CREATE VIEW v_efectos AS
SELECT m.id AS movimiento_id, m.fecha_efectiva, m.tipo, m.estado, p.cuenta_id, p.valor,
       (k.fecha_corte IS NOT NULL AND m.fecha_efectiva <= k.fecha_corte) AS historico
  FROM movimientos m
  CROSS JOIN LATERAL (
    SELECT m.cuenta_id, CASE m.tipo WHEN 'ingreso' THEN m.valor ELSE -m.valor END
    UNION ALL
    SELECT m.cuenta_destino_id, m.valor WHERE m.tipo = 'traslado'
  ) AS p(cuenta_id, valor)
  JOIN v_cortes k ON k.cuenta_id = p.cuenta_id;

-- Movimientos con la información que puede ver el rol de consulta: sin
-- nombre de aportantes ni conceptos escritos a mano en ingresos de miembros.
CREATE VIEW v_movimientos_consulta AS
SELECT m.id, m.fecha_efectiva, m.tipo, m.cuenta_id, m.cuenta_destino_id, m.categoria_id,
       CASE WHEN m.miembro_id IS NOT NULL THEN coalesce(cat.nombre, 'Aporte de miembro') ELSE m.concepto END AS concepto,
       CASE WHEN m.miembro_id IS NOT NULL THEN NULL ELSE m.tercero END AS tercero,
       (m.miembro_id IS NOT NULL) AS de_miembro,
       m.valor, m.medio_pago, m.fondo_id, m.referencia_autorizacion, m.obligacion_id, m.reembolsa_a,
       m.excedente_destino, m.corrige_a, m.estado, m.registrado_en, m.verificado_en, m.anulado_en,
       m.motivo_anulacion,
       (k.fecha_corte IS NOT NULL AND m.fecha_efectiva <= k.fecha_corte) AS historico,
       EXISTS (SELECT 1 FROM soportes s WHERE s.movimiento_id = m.id) AS tiene_soporte
  FROM movimientos m
  LEFT JOIN categorias cat ON cat.id = m.categoria_id
  JOIN v_cortes k ON k.cuenta_id = m.cuenta_id;

-- Estado de cada compromiso (detalle individual: solo tesorería).
CREATE VIEW v_compromisos_estado AS
SELECT c.*,
       coalesce(ap.verificado, 0) AS abonado,
       coalesce(ap.por_verificar, 0) AS por_verificar,
       c.monto - coalesce(ap.verificado, 0) AS saldo,
       CASE
         WHEN c.estado = 'anulado' THEN 'anulado'
         WHEN coalesce(ap.verificado, 0) >= c.monto THEN 'completo'
         WHEN c.fecha_acordada < hoy_co() THEN 'vencido'
         WHEN coalesce(ap.verificado, 0) > 0 THEN 'parcial'
         ELSE 'pendiente'
       END AS situacion
  FROM compromisos c
  LEFT JOIN LATERAL (
    SELECT sum(a.valor) FILTER (WHERE m.estado = 'verificado') AS verificado,
           sum(a.valor) FILTER (WHERE m.estado = 'pendiente') AS por_verificar
      FROM aplicaciones a JOIN movimientos m ON m.id = a.movimiento_id
     WHERE a.compromiso_id = c.id
  ) ap ON true;

-- Recaudo agregado (lo que ve consulta): sin personas.
CREATE VIEW v_recaudo_agregado AS
SELECT e.id AS esquema_id, e.nombre AS esquema, e.tipo, e.estado AS esquema_estado,
       c.destino, c.periodo,
       count(*) AS compromisos,
       sum(c.monto) AS comprometido,
       sum(c.abonado) AS recaudado,
       sum(c.por_verificar) AS por_verificar,
       sum(c.saldo) AS pendiente,
       sum(c.saldo) FILTER (WHERE c.situacion = 'vencido') AS pendiente_vencido,
       count(*) FILTER (WHERE c.situacion = 'completo') AS n_completos,
       count(*) FILTER (WHERE c.situacion = 'parcial') AS n_parciales,
       count(*) FILTER (WHERE c.situacion = 'pendiente') AS n_pendientes,
       count(*) FILTER (WHERE c.situacion = 'vencido') AS n_vencidos
  FROM v_compromisos_estado c
  JOIN esquemas_aporte e ON e.id = c.esquema_id
 WHERE c.estado = 'vigente'
 GROUP BY e.id, e.nombre, e.tipo, e.estado, c.destino, c.periodo;

-- Gastos comprometidos con lo pagado (verificado) y su saldo.
CREATE VIEW v_obligaciones_estado AS
SELECT o.*,
       coalesce(p.pagado, 0) AS pagado,
       coalesce(p.por_verificar, 0) AS pago_por_verificar,
       CASE WHEN o.estado = 'vigente' THEN o.monto - coalesce(p.pagado, 0) ELSE 0 END AS saldo
  FROM obligaciones o
  LEFT JOIN LATERAL (
    SELECT sum(valor) FILTER (WHERE estado = 'verificado') AS pagado,
           sum(valor) FILTER (WHERE estado = 'pendiente') AS por_verificar
      FROM movimientos WHERE obligacion_id = o.id
  ) p ON true;

-- Ingresos y egresos de cada fondo (reembolsos netean el egreso de origen).
CREATE VIEW v_fondo_flujos AS
SELECT m.fondo_id, m.fecha_efectiva,
       CASE WHEN m.tipo = 'ingreso' AND m.reembolsa_a IS NULL THEN m.valor ELSE 0 END AS ingreso,
       CASE WHEN m.tipo = 'egreso' THEN m.valor ELSE 0 END AS egreso,
       0::bigint AS reembolso
  FROM v_movimientos_consulta m
 WHERE m.estado = 'verificado' AND NOT m.historico AND m.fondo_id IS NOT NULL AND m.tipo <> 'traslado'
UNION ALL
SELECT o.fondo_id, r.fecha_efectiva, 0, 0, r.valor
  FROM v_movimientos_consulta r
  JOIN movimientos o ON o.id = r.reembolsa_a
 WHERE r.estado = 'verificado' AND NOT r.historico AND o.fondo_id IS NOT NULL;

-- Ingresos clasificados por concepto. Un ingreso distribuido entre
-- compromisos se divide según el destino de cada compromiso; el remanente se
-- clasifica según la decisión de tesorería (saldo a favor o aporte adicional)
-- o, si no hay distribución, según su categoría. No incluye nombres.
CREATE VIEW v_ingresos_concepto AS
SELECT m.id AS movimiento_id, m.fecha_efectiva, m.estado, m.historico,
       CASE c.destino
         WHEN 'gastos_constitucion' THEN 'Aportes de constitución: gastos de constitución'
         WHEN 'patrimonio_inicial' THEN 'Aportes de constitución: patrimonio inicial'
         ELSE 'Aportes mensuales de sostenimiento'
       END AS concepto,
       sum(a.valor)::bigint AS valor
  FROM v_movimientos_consulta m
  JOIN aplicaciones a ON a.movimiento_id = m.id
  JOIN compromisos c ON c.id = a.compromiso_id
 WHERE m.tipo = 'ingreso' AND m.reembolsa_a IS NULL
 GROUP BY m.id, m.fecha_efectiva, m.estado, m.historico, c.destino
UNION ALL
SELECT m.id, m.fecha_efectiva, m.estado, m.historico,
       CASE m.excedente_destino
         WHEN 'saldo_a_favor' THEN 'Saldos a favor de aportantes (por aplicar)'
         WHEN 'aporte_adicional' THEN 'Aportes voluntarios adicionales'
         ELSE coalesce(cat.nombre, 'Sin categoría')
       END,
       (m.valor - coalesce(ap.total, 0))::bigint
  FROM v_movimientos_consulta m
  LEFT JOIN categorias cat ON cat.id = m.categoria_id
  LEFT JOIN LATERAL (SELECT sum(valor) AS total FROM aplicaciones WHERE movimiento_id = m.id) ap ON true
 WHERE m.tipo = 'ingreso' AND m.reembolsa_a IS NULL AND m.valor - coalesce(ap.total, 0) > 0;

-- Saldo a favor de cada aportante: remanentes de ingresos marcados como
-- saldo a favor que aún no se han aplicado a compromisos (solo tesorería).
CREATE VIEW v_saldos_a_favor AS
SELECT m.miembro_id, m.id AS movimiento_id, m.fecha_efectiva, m.estado, m.valor,
       coalesce(ap.total, 0)::bigint AS aplicado,
       (m.valor - coalesce(ap.total, 0))::bigint AS disponible
  FROM movimientos m
  LEFT JOIN LATERAL (SELECT sum(valor) AS total FROM aplicaciones WHERE movimiento_id = m.id) ap ON true
 WHERE m.tipo = 'ingreso' AND m.excedente_destino = 'saldo_a_favor' AND m.estado <> 'anulado'
   AND m.miembro_id IS NOT NULL AND m.valor - coalesce(ap.total, 0) > 0;

-- ═══════════════════════════════════════════════════════════════════════
-- Funciones de autenticación (SECURITY DEFINER, con validaciones propias)
-- ═══════════════════════════════════════════════════════════════════════

-- Configuración inicial: solo funciona mientras no exista ninguna cuenta.
CREATE OR REPLACE FUNCTION fn_configuracion_inicial(
  p_t_usuario text, p_t_nombre text, p_t_hash text,
  p_c_usuario text, p_c_nombre text, p_c_hash text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id integer;
BEGIN
  PERFORM pg_advisory_xact_lock(4242001);
  IF EXISTS (SELECT 1 FROM usuarios) THEN
    RAISE EXCEPTION 'La configuración inicial ya se realizó.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO usuarios (usuario, nombre, rol, clave_hash)
  VALUES (p_t_usuario, p_t_nombre, 'tesoreria', p_t_hash) RETURNING id INTO v_id;
  INSERT INTO usuarios (usuario, nombre, rol, clave_hash, creado_por)
  VALUES (p_c_usuario, p_c_nombre, 'consulta', p_c_hash, v_id);
END $$;

CREATE OR REPLACE FUNCTION fn_hay_usuarios() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios)
$$;

-- Crear cuenta (solo tesorería).
CREATE OR REPLACE FUNCTION fn_crear_usuario(p_usuario text, p_nombre text, p_rol text, p_hash text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = usuario_actual() AND rol = 'tesoreria' AND activo) THEN
    RAISE EXCEPTION 'Solo tesorería puede crear cuentas.' USING ERRCODE = '42501';
  END IF;
  IF p_rol <> 'consulta' THEN
    RAISE EXCEPTION 'Desde la aplicación solo se crean cuentas de consulta. Las de tesorería se crean con el procedimiento administrativo (README).'
      USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO usuarios (usuario, nombre, rol, clave_hash, creado_por)
  VALUES (p_usuario, p_nombre, p_rol, p_hash, usuario_actual()) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Enlace de restablecimiento para una cuenta de consulta (solo tesorería).
CREATE OR REPLACE FUNCTION fn_crear_restablecimiento(p_usuario_id integer, p_token_hash text, p_horas integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = usuario_actual() AND rol = 'tesoreria' AND activo) THEN
    RAISE EXCEPTION 'Solo tesorería puede restablecer accesos.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_id AND rol = 'consulta') THEN
    RAISE EXCEPTION 'Desde la aplicación solo se restablecen cuentas de consulta.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE restablecimientos SET usado_en = now() WHERE usuario_id = p_usuario_id AND usado_en IS NULL;
  INSERT INTO restablecimientos (usuario_id, token_hash, creado_por, expira_en)
  VALUES (p_usuario_id, p_token_hash, usuario_actual(), now() + make_interval(hours => p_horas));
  INSERT INTO historial (tabla, registro_id, accion, despues, usuario_id)
  VALUES ('usuarios', p_usuario_id::text, 'enlace_restablecimiento', jsonb_build_object('horas', p_horas), usuario_actual());
END $$;

-- Validar enlace (sin sesión).
CREATE OR REPLACE FUNCTION fn_validar_restablecimiento(p_token_hash text)
RETURNS TABLE (usuario text, nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.usuario, u.nombre FROM restablecimientos r JOIN usuarios u ON u.id = r.usuario_id
   WHERE r.token_hash = p_token_hash AND r.usado_en IS NULL AND r.expira_en > now() AND u.activo
$$;

-- Usar enlace: cambia la clave, invalida el enlace y cierra todas las sesiones.
CREATE OR REPLACE FUNCTION fn_usar_restablecimiento(p_token_hash text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r record;
BEGIN
  SELECT r.* INTO v_r FROM restablecimientos r JOIN usuarios u ON u.id = r.usuario_id
   WHERE r.token_hash = p_token_hash AND r.usado_en IS NULL AND r.expira_en > now() AND u.activo
   FOR UPDATE OF r;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE restablecimientos SET usado_en = now() WHERE id = v_r.id;
  UPDATE usuarios SET clave_hash = p_hash, clave_cambiada_en = now() WHERE id = v_r.usuario_id;
  DELETE FROM sesiones WHERE usuario_id = v_r.usuario_id;
  RETURN true;
END $$;

-- Cambio de la propia clave (la app ya verificó la clave actual).
CREATE OR REPLACE FUNCTION fn_cambiar_mi_clave(p_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF usuario_actual() IS NULL THEN
    RAISE EXCEPTION 'Sin sesión.' USING ERRCODE = '42501';
  END IF;
  UPDATE usuarios SET clave_hash = p_hash, clave_cambiada_en = now() WHERE id = usuario_actual();
  DELETE FROM sesiones WHERE usuario_id = usuario_actual()
     AND id <> coalesce(NULLIF(current_setting('app.sesion_id', true), '')::bigint, -1);
END $$;

-- Hash de la propia clave, para verificar la clave actual antes de cambiarla.
CREATE OR REPLACE FUNCTION fn_mi_hash() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clave_hash FROM usuarios WHERE id = usuario_actual() AND activo
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Permisos
-- ═══════════════════════════════════════════════════════════════════════
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, tes_auth, tes_consulta, tes_tesoreria;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hoy_co(), usuario_actual(), es_primer_dia(date), periodo_cerrado(integer, date)
  TO tes_auth, tes_consulta, tes_tesoreria;
GRANT EXECUTE ON FUNCTION tg_historial(), tg_movimientos_guardia(), tg_aplicaciones_guardia(),
  tg_compromisos_guardia(), tg_esquemas_guardia(), tg_adhesiones_guardia(), tg_obligaciones_guardia(),
  tg_solo_agregar(), tg_comprobantes_guardia(), tg_soportes_guardia(), tg_saldos_iniciales_guardia(),
  tg_cierres_guardia(), tg_usuarios_guardia()
  TO tes_tesoreria;
GRANT EXECUTE ON FUNCTION tg_historial(), tg_usuarios_guardia() TO tes_auth;

-- Autenticación (antes de saber quién es la persona)
GRANT SELECT (id, usuario, nombre, rol, clave_hash, activo) ON usuarios TO tes_auth;
GRANT UPDATE (ultimo_acceso) ON usuarios TO tes_auth;
GRANT SELECT, INSERT, UPDATE (ultima_actividad), DELETE ON sesiones TO tes_auth;
GRANT USAGE ON SEQUENCE sesiones_id_seq TO tes_auth;
GRANT SELECT, INSERT, DELETE ON intentos_acceso TO tes_auth;
GRANT USAGE ON SEQUENCE intentos_acceso_id_seq TO tes_auth;
GRANT EXECUTE ON FUNCTION fn_configuracion_inicial(text, text, text, text, text, text),
  fn_hay_usuarios(), fn_validar_restablecimiento(text), fn_usar_restablecimiento(text, text)
  TO tes_auth;

-- Funciones para cualquier persona con sesión
GRANT EXECUTE ON FUNCTION fn_cambiar_mi_clave(text), fn_mi_hash() TO tes_consulta, tes_tesoreria;

-- Consulta: solo lectura y solo información agregada o institucional
GRANT SELECT ON configuracion, cuentas, categorias, fondos, saldos_iniciales, esquemas_aporte,
  obligaciones, presupuesto_anual, presupuesto, cierres, fondo_asignaciones
  TO tes_consulta;
GRANT SELECT ON v_cortes, v_efectos, v_movimientos_consulta, v_recaudo_agregado,
  v_obligaciones_estado, v_fondo_flujos, v_ingresos_concepto
  TO tes_consulta;
GRANT SELECT (id, usuario, nombre, rol, activo) ON usuarios TO tes_consulta;
-- Comprobantes: consulta solo ve los marcados sin datos personales (RLS abajo)
GRANT SELECT ON comprobantes, soportes TO tes_consulta;

-- Tesorería: lectura completa y escritura de la operación
GRANT SELECT ON configuracion, cuentas, categorias, fondos, miembros, miembros_contacto,
  comprobantes, saldos_iniciales, esquemas_aporte, adhesiones, compromisos, obligaciones,
  movimientos, soportes, aplicaciones, fondo_asignaciones, presupuesto_anual, presupuesto,
  cierres, historial
  TO tes_tesoreria;
GRANT SELECT ON v_cortes, v_efectos, v_movimientos_consulta, v_compromisos_estado,
  v_recaudo_agregado, v_obligaciones_estado, v_fondo_flujos, v_ingresos_concepto, v_saldos_a_favor
  TO tes_tesoreria;
GRANT SELECT (id, usuario, nombre, rol, activo, creado_en, creado_por, ultimo_acceso, clave_cambiada_en)
  ON usuarios TO tes_tesoreria;
GRANT UPDATE (nombre, activo) ON usuarios TO tes_tesoreria;
GRANT DELETE ON sesiones TO tes_tesoreria;
GRANT SELECT (id, usuario_id, creada_en, expira_en, ultima_actividad) ON sesiones TO tes_tesoreria;
GRANT EXECUTE ON FUNCTION fn_crear_usuario(text, text, text, text),
  fn_crear_restablecimiento(integer, text, integer) TO tes_tesoreria;

GRANT UPDATE (dia_pago_mensual, smmlv, smmlv_anio, umbral_smmlv_junta, patrimonio_estado,
  patrimonio_nota, actualizado_en) ON configuracion TO tes_tesoreria;
GRANT INSERT, UPDATE ON cuentas, categorias, fondos, miembros, esquemas_aporte, adhesiones,
  compromisos, obligaciones, presupuesto_anual, presupuesto, cierres
  TO tes_tesoreria;
GRANT INSERT, UPDATE, DELETE ON miembros_contacto TO tes_tesoreria;
GRANT INSERT, UPDATE, DELETE ON movimientos TO tes_tesoreria;   -- borrar: solo pendientes (disparador)
GRANT INSERT, UPDATE, DELETE ON aplicaciones TO tes_tesoreria;
GRANT INSERT, DELETE ON adhesiones TO tes_tesoreria;
GRANT INSERT, DELETE ON soportes TO tes_tesoreria;
GRANT INSERT, DELETE ON comprobantes TO tes_tesoreria;
GRANT UPDATE (datos_personales, descripcion) ON comprobantes TO tes_tesoreria;
GRANT INSERT, UPDATE ON saldos_iniciales TO tes_tesoreria;
GRANT INSERT ON fondo_asignaciones TO tes_tesoreria;
GRANT DELETE ON presupuesto TO tes_tesoreria;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tes_tesoreria;

-- Seguridad por filas en comprobantes
ALTER TABLE comprobantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY comprobantes_tesoreria ON comprobantes TO tes_tesoreria USING (true) WITH CHECK (true);
CREATE POLICY comprobantes_consulta ON comprobantes FOR SELECT TO tes_consulta USING (NOT datos_personales);
ALTER TABLE soportes ENABLE ROW LEVEL SECURITY;
CREATE POLICY soportes_tesoreria ON soportes TO tes_tesoreria USING (true) WITH CHECK (true);
CREATE POLICY soportes_consulta ON soportes FOR SELECT TO tes_consulta
  USING (EXISTS (SELECT 1 FROM comprobantes c WHERE c.id = comprobante_id));
