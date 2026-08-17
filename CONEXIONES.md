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

### El objetivo: link público, datos privados

La app queda en una dirección web que puede abrir cualquiera, pero **al entrar pide
tu correo y contraseña** y solo entonces aparecen tus expedientes. Quien entre sin
tu clave ve únicamente la pantalla de acceso: **no puede leer nada**.

Eso se consigue con **Supabase Auth** (usuarios) + **RLS** (cada fila pertenece a un
usuario y la base solo entrega las tuyas). No basta con "esconder" el enlace: la
protección la aplica el servidor.

### Pasos para dejarlo listo (plan gratuito)

1. Crea una cuenta en **https://supabase.com** y un **proyecto nuevo** (anota la
   contraseña de la base que te pida; no la necesitarás para la app).
2. En el proyecto, abre **SQL Editor** y ejecuta esto tal cual:

   ```sql
   create table requerimientos (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
     historial jsonb default '[]'::jsonb,
     creado timestamptz default now(),
     actualizado timestamptz default now()
   );

   create index requerimientos_user_idx on requerimientos(user_id);

   -- Seguridad por filas: cada quien ve SOLO lo suyo
   alter table requerimientos enable row level security;

   create policy "ver lo mio"      on requerimientos for select
     using (auth.uid() = user_id);
   create policy "crear lo mio"    on requerimientos for insert
     with check (auth.uid() = user_id);
   create policy "editar lo mio"   on requerimientos for update
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create policy "borrar lo mio"   on requerimientos for delete
     using (auth.uid() = user_id);

   -- Mismo esquema para tus preferencias (pestañas, listas, columnas)
   create table ajustes (
     user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
     datos jsonb not null default '{}'::jsonb,
     actualizado timestamptz default now()
   );
   alter table ajustes enable row level security;
   create policy "mis ajustes" on ajustes for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```

3. En **Authentication → Users**, crea tu usuario con **Add user → Create new user**
   (tu correo y una contraseña). Con eso entrarás a la app.
   > En *Authentication → Providers → Email*, desactiva **"Confirm email"** si no
   > quieres el paso de confirmación por correo.

4. En **Project Settings → API**, copia y mándame:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - **anon public key** (es una clave pública: **con RLS activo es seguro** que
     viaje en la página, porque sin iniciar sesión no devuelve ninguna fila).
   - ⚠️ **Nunca** compartas la `service_role key`: esa sí salta la seguridad.

5. Con esos dos datos adapto la app: pantalla de acceso, sincronización con la nube
   (y caché local para seguir trabajando si se cae el internet), conservando todo lo
   actual: pestañas, edición en celda, filtros, historial, Excel, etc.

### Dónde publicar la app (gratis)

- **GitHub Pages**: ya tienes el repositorio; se activa en *Settings → Pages* y queda
  en `https://renzomoran9.github.io/PRIORITY/`.
- **Netlify / Vercel**: arrastras la carpeta y te dan una dirección; permiten poner
  un nombre propio más fácil.

En ambos casos **solo se publica el programa**, nunca tus expedientes: esos viajan
por la sesión iniciada contra Supabase.

### Que un Proyecto de Claude consulte esos expedientes

Claude no puede iniciar sesión en tu app, así que hay dos caminos:

- **Google Drive (recomendado)**: la app guarda/actualiza el resumen `.md` en tu
  Drive y activas el conector de Drive en Claude. Privado y siempre al día.
- **Enlace secreto**: una función de Supabase que entrega el resumen solo si la
  dirección incluye un código largo que únicamente tú conoces. Cómodo, pero quien
  vea ese enlace podría leerlo: menos seguro que Drive.

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
