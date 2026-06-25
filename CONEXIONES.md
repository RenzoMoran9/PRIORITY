# Conectar PRIORITY con Excel y/o Supabase

Esta app guarda los datos en **tu navegador** (localStorage). Aquí se explica cómo
sacar esos datos hacia **Excel** y qué implica llevarlos a la **nube con Supabase**.

---

## A) Que Excel “jale” lo que vas ingresando

### Opción 1 — Vínculo a un archivo que se actualiza solo (Chrome/Edge)

1. En la app, pulsa **🔗 Vincular Excel** y elige (o crea) un archivo, p. ej. `requerimientos.csv`.
2. A partir de ahí, **cada vez que edites una celda, la app reescribe ese archivo automáticamente**.
3. En **Excel**: *Datos → Obtener datos → Desde archivo → Desde texto/CSV* → elige ese mismo archivo → *Cargar*.
4. Cuando quieras ver lo nuevo, en Excel pulsa **Datos → Actualizar todo**
   (o configúralo en *Consulta → Propiedades → Actualizar al abrir / cada N minutos*).

> Requisitos: **Chrome o Edge**. Si abres la app con doble clic (ruta `file://`) el
> navegador puede bloquear el vínculo; en ese caso sirve abrir la app desde un
> servidor (incluso uno local) o usar la Opción 2.

### Opción 2 — Exportar / Importar (funciona en cualquier navegador)

- **⬇ Exportar**: descarga un CSV con todo; Excel lo abre directo.
- **⬆ Importar**: vuelve a cargar un CSV (para respaldos o pasar a otra PC).

> Importante: esto es **un solo sentido** (de la app hacia Excel). Si editas en
> Excel, esos cambios **no** vuelven solos a la app; tendrías que **Importar** el CSV.

---

## B) Conectar a Supabase (nube)

Supabase es una base de datos en la nube (PostgreSQL) con API y usuarios. Llevar la
app ahí cambia esto:

| | Hoy (localStorage) | Con Supabase (nube) |
|---|---|---|
| Dónde viven los datos | Solo en ese navegador/PC | En la nube |
| Varios equipos / celular | No | **Sí**, mismos datos en todos |
| Varias personas a la vez | No | **Sí**, con cambios en vivo |
| Internet | No necesita | **Necesita** |
| Riesgo de perder datos | Si borras caché, se pierden | Respaldado en la nube |
| Excel automático | Limitado | **Sí** (Power Query/ODBC a Postgres) |
| Configuración | Ninguna | Crear proyecto + tabla + claves |

### Pasos para dejarlo listo (plan gratuito)

1. Crea una cuenta en **https://supabase.com** y un **proyecto nuevo**.
2. En el proyecto, abre **SQL Editor** y ejecuta esto para crear la tabla:

   ```sql
   create table requerimientos (
     id uuid primary key default gen_random_uuid(),
     pestana text,
     nro text,
     fecha_ingreso date,
     exp_logistica text,
     exp_direccion text,
     doc_area text,
     area_estrategica text,
     area_usuaria text,
     tipo text,
     denominacion text,
     item text,
     especialista text,
     fecha_pase date,
     estado text,
     prioridad text,
     observaciones text,
     tengo_exp text,
     a_cargo text,
     creado timestamptz default now(),
     actualizado timestamptz default now()
   );

   -- Seguridad por filas (RLS)
   alter table requerimientos enable row level security;

   -- Para empezar rápido (acceso con la clave anónima). Más adelante conviene
   -- restringir por usuario con Supabase Auth.
   create policy "acceso_basico" on requerimientos
     for all using (true) with check (true);
   ```

3. En **Project Settings → API**, copia:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key** (clave pública; es segura de usar en el front si tienes RLS).

4. Avísame y yo adapto la app para que use Supabase: guardará y leerá de la nube,
   con **sincronización en vivo** (varios equipos verán los cambios al instante) y
   manteniendo todo lo actual (pestañas, edición en celda, filtros, zoom…).

### Excel desde Supabase

Una vez en Supabase, Excel puede conectarse de dos formas:
- **Power Query → Desde base de datos PostgreSQL** (con los datos de conexión del proyecto), o
- **Power Query → Desde web**, usando la **API REST** que Supabase genera sola.

En ambos casos, *Actualizar todo* en Excel trae lo último.

---

## ¿Cuál elegir?

- Solo quieres **verlo en Excel** en tu PC → **A) Vínculo a archivo** o **Exportar**.
- Quieres **compartir, varios equipos/personas y Excel en vivo** → **B) Supabase**
  (o, si prefieres algo más simple de administrar, **Google Sheets**).
