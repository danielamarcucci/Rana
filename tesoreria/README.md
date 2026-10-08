# Tesorería de la Red

Aplicación privada para administrar y consultar las finanzas de la **Red Nacional por
la Defensa de la Reforma Agraria** (figura jurídica: Corporación por la Defensa de la
Reforma Agraria). Interfaz en español, valores en pesos colombianos y fechas en hora
de Colombia.

- **Tesorería**: registra miembros, compromisos de aportes, ingresos, egresos,
  presupuesto y soportes; verifica pagos, concilia saldos, genera informes, administra
  las cuentas de consulta y consulta el historial de cambios.
- **Consulta**: ve el resumen financiero, el recaudo agregado, los gastos, el
  presupuesto y los informes. No puede crear, modificar, verificar ni eliminar nada, y
  no ve datos de contacto, comprobantes con datos personales ni el detalle individual
  de compromisos.

Los permisos se aplican en tres capas: la interfaz, el servidor (cada acción comprueba
la sesión y el rol) y **la base de datos** (cada solicitud corre con un rol de
PostgreSQL —`tes_consulta` o `tes_tesoreria`— que solo tiene los privilegios
concedidos en `db/migraciones/002_reglas.sql`).

## Identidad visual

El logo, los colores (olivo, tierra, ocre) y las tipografías (Open Sans y Open Sans
Condensed ExtraBold, licencia SIL OFL) se tomaron del sitio de la Red,
redagrariacolombia.com. El logo está en `public/marca/` y las fuentes en
`src/app/fuentes/` y `src/lib/pdf/fuentes/`.

## Qué incluye

| Sección | Contenido |
|---|---|
| Resumen | Recibido, gastado, saldo de caja y bancos, aportes por recaudar, gastos pendientes y disponible estimado; filtros por periodo, gráfico mensual y últimos movimientos. |
| Aportes | Constitución (presupuesto de gastos, metas separadas para gastos y patrimonio inicial, avance) y mensualidades (aceptaciones con montos distintos, generación de compromisos sin duplicados, estados). Esquemas con la referencia del acuerdo que los sustenta. |
| Movimientos | Ingresos, egresos, traslados y reembolsos; comprobantes PDF/JPG/PNG privados; verificación; anulación y corrección con motivo; distribución de un pago entre varios meses y saldo a favor. |
| Presupuesto | Presupuesto mensual por categoría frente a lo ejecutado, gastos comprometidos con sus pagos, reservas y fondos con destinación específica. |
| Informes | Informe mensual (PDF y CSV), versión agregada o con detalle individual (solo tesorería), cierre mensual y conciliación. |
| Miembros (tesorería) | Personas y organizaciones, vínculo, estado, contacto privado, compromisos, pagos y saldo a favor. |
| Configuración (tesorería) | Cuentas, saldo inicial, categorías, parámetros, cuentas de acceso, historial de cambios, exportaciones de respaldo. |

### Reglas tomadas de los estatutos

- **Art. 39**: la tesorería maneja el patrimonio en coordinación con la presidencia. La
  aplicación distingue lo *registrado por tesorería* de una *autorización*: las
  referencias de autorización (actas, decisiones) se registran como texto con soporte y
  la interfaz aclara que no constituyen una aprobación digital de la presidencia.
- **Art. 43, lit. d**: aportes voluntarios. El excedente de un pago puede registrarse
  como aporte adicional voluntario, por decisión expresa de tesorería.
- **Art. 43, par. 2**: el patrimonio de $10.000.000 aparece en Configuración solo como
  dato informativo, con estado "por confirmar". **No** se carga como saldo, ingreso ni
  meta. El saldo inicial se introduce expresamente por cuenta, con fecha de corte y
  soporte obligatorio.
- **Art. 26, lit. c**: el presupuesto anual se marca como borrador o aprobado por la
  Asamblea, con la referencia del acta.
- **Art. 30, lit. c**: aviso discreto cuando un egreso supera 30 SMMLV (el valor del
  SMMLV y el umbral se configuran) y no tiene referencia de autorización de la Junta.
- **Art. 46**: el periodo por defecto es el año calendario.
- Una **propuesta** de mensualidad no crea obligaciones: solo un esquema *aprobado*, con
  órgano, referencia y fecha del acuerdo, admite compromisos, y solo para quienes
  registraron su aceptación expresa.
- No se aplican intereses, sanciones ni restricciones por falta de pago. La aplicación
  usa el término "aporte pendiente".

### Reglas contables

- Dinero en **centavos enteros** (BIGINT); nunca punto flotante.
- **Fecha efectiva** distinta de la fecha de registro.
- Solo los movimientos **verificados** afectan los saldos; los pendientes de
  verificación se muestran aparte.
- Los movimientos con fecha igual o anterior al **corte del saldo inicial** de su cuenta
  quedan como históricos: cuentan para el recaudo de compromisos, pero no se suman otra
  vez al saldo.
- Los **traslados** entre cuentas propias no son ingresos ni egresos. Un **reembolso**
  disminuye el egreso que lo originó (misma categoría y fondo) y no puede superarlo.
- Un movimiento verificado **no se edita ni se borra**: se anula con motivo o se
  registra una corrección, que anula el original. Los pendientes pueden editarse.
- Un pago puede distribuirse entre varios compromisos (abonos parciales, anticipos,
  varios meses) sin duplicar el ingreso. Lo distribuido no puede superar lo recibido ni
  el saldo de cada compromiso. El excedente queda como saldo a favor o aporte adicional.
- **Disponible estimado** = caja − Σ por fondo de máx(saldo del fondo, pendientes con
  cargo a ese fondo) − gastos pendientes sin fondo. Así una obligación cubierta por una
  reserva no se descuenta dos veces, y pagarla no cambia el disponible.
- Un mes **cerrado** no admite registros ni cambios en esa cuenta hasta reabrirlo con
  motivo.
- **Historial** automático (disparadores de la base de datos) de cada creación,
  modificación y eliminación, con usuario y hora. Ningún rol de la aplicación puede
  alterarlo.

Estas reglas se aplican en la base de datos (restricciones y disparadores), no solo en
la interfaz.

## Tecnología

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS.
- PostgreSQL 16 o posterior (recomendado: **Neon**, gratuito, integrado con Vercel).
- Comprobantes guardados **dentro de la base de datos** (privados, sin enlaces
  públicos); se entregan solo a través de `/api/comprobantes/[id]` con sesión y según
  el rol. Se valida el tipo real por su contenido (PDF, JPG, PNG) y el tamaño (8 MB por
  defecto).
- Contraseñas con scrypt; sesiones en la base de datos (cookie `HttpOnly`, `Secure`,
  `SameSite=Lax`), cierre por inactividad (2 h) y duración máxima (12 h); bloqueo
  temporal tras intentos fallidos.
- PDF con `pdf-lib`; CSV para Excel en español (UTF-8, separador `;`, coma decimal).

## Despliegue (Vercel + Neon)

El proyecto vive en la carpeta `tesoreria/` del repositorio y se despliega como un
**proyecto de Vercel aparte** del sistema de denuncias, con **su propia base de datos**.

1. **Vercel → Add New… → Project** e importe el repositorio `Rana`.
2. En **Root Directory** elija `tesoreria`. Vercel detecta Next.js; no cambie el
   comando de compilación (`npm run build` aplica las migraciones y luego compila).
3. Antes de desplegar, en **Storage → Connect Database → Neon**, cree una base de
   datos nueva (por ejemplo `tesoreria-red`), región São Paulo (`sa-east-1`) si está
   disponible. Vercel agrega `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
4. En **Settings → Environment Variables** agregue `CLAVE_CONFIGURACION`: un texto
   aleatorio de al menos 20 caracteres, generado por un gestor de contraseñas.
   Opcional: `APP_URL` con la dirección final (por ejemplo `https://tesoreria-red.vercel.app`).
5. En **Settings → Git → Production Branch**, indique la rama que contiene esta versión.
6. Despliegue. La compilación crea las tablas, los roles y los permisos.

### Configurar de forma segura las dos cuentas iniciales

1. Abra la dirección de la aplicación: lo llevará a **Configuración inicial**.
2. Escriba la `CLAVE_CONFIGURACION` y defina:
   - la cuenta de **tesorería** (su nombre, un usuario y una contraseña de al menos 12
     caracteres; se recomienda una frase larga),
   - la cuenta de **consulta** (por ejemplo, para la Junta Directiva).
3. Al guardar, la página de configuración queda **desactivada para siempre** (solo
   funciona mientras no existe ninguna cuenta).
4. **Borre `CLAVE_CONFIGURACION`** de las variables de Vercel.
5. Entregue la contraseña de consulta por un canal seguro, o pida a esa persona que la
   cambie en **Cuenta → Cambiar contraseña**.

Ninguna contraseña está en el código ni en el repositorio; solo se guarda su hash.

### Cuentas posteriores y recuperación de acceso

- **Cuentas de consulta individuales**: Configuración → Cuentas de acceso → *Nueva
  cuenta de consulta*. Se genera un **enlace de un solo uso** (72 h) para que la persona
  defina su propia contraseña; tesorería nunca la conoce. Desde allí también se genera
  un enlace de restablecimiento o se desactiva una cuenta (cierra sus sesiones).
- **Cuentas de tesorería** (por ejemplo, la persona suplente) y recuperación de la
  contraseña de tesorería: procedimiento administrativo desde un computador con Node.js
  y la conexión del propietario de la base de datos (Neon → *Connection string*):

  ```bash
  cd tesoreria
  npm install
  export DATABASE_URL='postgresql://…'         # conexión del propietario (Neon)
  npm run cuenta -- listar
  npm run cuenta -- crear suplente.tesoreria tesoreria "Nombre completo"
  npm run cuenta -- restablecer tesoreria
  npm run cuenta -- desactivar nombre.usuario
  ```

  La contraseña se pide por teclado sin mostrarse. Siempre debe quedar una cuenta de
  tesorería activa.

## Primeros pasos en la aplicación

1. **Configuración → Cuentas**: registre la cuenta bancaria y la caja (solo nombre y
   últimos 4 dígitos).
2. **Configuración → Saldo inicial**: por cada cuenta, fecha de corte, saldo y soporte
   (extracto o arqueo).
3. **Configuración → Parámetros**: día de pago mensual por defecto y SMMLV vigente.
4. **Miembros**: registre personas y organizaciones (vínculo, estado, contacto opcional).
5. **Aportes → Esquemas**: cree el esquema de constitución y el mensual. Déjelos como
   *propuesta* hasta que exista el acuerdo; luego márquelos como *aprobados* con el
   órgano, la referencia y la fecha del acta.
6. En la ficha de cada miembro: compromiso de constitución y, si aceptó, la aceptación
   de la mensualidad (monto propio, mes de inicio y, si aplica, de finalización).
7. **Aportes → Mensualidades → Generar compromisos** para los meses que correspondan.
8. **Movimientos → Registrar**: al elegir el aportante, distribuya el pago entre sus
   compromisos y decida qué hacer con el excedente.

Todos los montos, fechas y miembros quedan configurables; no se cargan datos de ejemplo.

## Respaldo y recuperación

1. **Automático (Neon)**: Neon conserva el historial de la base de datos y permite
   restaurarla a un momento anterior (*Restore* / *Branches*). Revise la ventana de
   retención de su plan y amplíela si lo necesita.
2. **Copia periódica completa** (recomendada mensualmente, después del cierre), desde
   un computador con PostgreSQL 16 o posterior instalado:

   ```bash
   pg_dump "$DATABASE_URL_UNPOOLED" --format=custom --no-owner \
     --file="respaldo-tesoreria-$(date +%Y-%m-%d).dump"
   ```

   El archivo incluye los comprobantes. Guárdelo cifrado y fuera del repositorio
   (la carpeta `respaldos/` está excluida de git).
3. **Restaurar** en una base de datos nueva y vacía. Si es un servidor nuevo, cree antes
   los tres roles (sin inicio de sesión) para que se restauren los permisos:

   ```bash
   psql "postgresql://…/base_nueva" -c "CREATE ROLE tes_auth NOLOGIN; CREATE ROLE tes_consulta NOLOGIN; CREATE ROLE tes_tesoreria NOLOGIN; GRANT tes_auth, tes_consulta, tes_tesoreria TO CURRENT_USER;"
   pg_restore --no-owner --dbname="postgresql://…/base_nueva" respaldo-tesoreria-AAAA-MM-DD.dump
   ```

   Luego apunte `DATABASE_URL` y `DATABASE_URL_UNPOOLED` de Vercel a esa base y vuelva a
   desplegar. Pruebe la restauración al menos una vez al año.
4. **Exportaciones de control** (Configuración → Respaldo): movimientos, compromisos y
   miembros en CSV, y un respaldo de datos en JSON (sin el contenido de los comprobantes).

## Modo de demostración

Para mostrar la herramienta sin datos reales, cree **otro** proyecto de Vercel y otra
base de datos, con `MODO_DEMO=1`. La aplicación muestra una franja visible de "MODO DE
DEMOSTRACIÓN". Para cargar datos ficticios en esa base:

```bash
MODO_DEMO=1 DATABASE_URL='postgresql://…demo…' npm run demo:cargar -- --confirmar-demo
```

El script se niega a ejecutarse si la base ya tiene movimientos que no son de
demostración.

## Desarrollo local y pruebas

```bash
cd tesoreria
npm install
cp .env.ejemplo .env.local      # complete DATABASE_URL (PostgreSQL 16+) y CLAVE_CONFIGURACION
npm run db:migrar
npm run dev                     # http://localhost:3000

# Pruebas: la base indicada se BORRA por completo; use una desechable.
TEST_DATABASE_URL='postgresql://…/tesoreria_pruebas' npm test
npm run typecheck && npm run lint
```

`tests/base.test.ts` comprueba contra PostgreSQL real, con los mismos roles de la
aplicación:

1. que consulta no puede modificar datos, aunque haga solicitudes directas a la base;
2. que sin sesión no se accede a información ni a comprobantes;
3. abonos parciales, anticipos, pagos de varios meses, saldo a favor, sin duplicados;
4. que anular o corregir ajusta los saldos y conserva el historial;
5. que el saldo inicial no duplica ingresos históricos;
6. que gastos pendientes, reservas, reembolsos y traslados no se cuentan dos veces.

`tests/calculos.test.ts` prueba la aritmética en centavos y el cálculo del disponible.
