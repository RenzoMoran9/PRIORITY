# PRIORITY · Seguimiento de Contrataciones Directas

Aplicación web sencilla para hacer seguimiento a las **contrataciones directas**
de logística, mapeadas por **prioridad** y **estado**, con un espacio tipo Excel
para ingresar y consultar los datos de cada expediente.

No requiere instalación ni internet: es HTML + CSS + JavaScript puro y los datos
se guardan en tu propio navegador.

## Cómo usarla

1. Descarga o clona esta carpeta.
2. Abre el archivo **`index.html`** con doble clic (se abre en tu navegador).
3. ¡Listo! Empieza a cargar tus expedientes.

> Sugerencia: si quieres ver cómo se ve con datos, pulsa **"Cargar datos de
> ejemplo"** en la pantalla inicial. Puedes borrarlos luego con **"Borrar todos
> los datos"**.

## Qué puedes hacer

- **Registrar expedientes** con: código, objeto de la contratación, proveedor,
  área solicitante, responsable, monto y moneda, prioridad, estado, fecha de
  ingreso, fecha límite y observaciones.
- **Prioridad**: Alta · Media · Baja (con colores).
- **Estado**: Pendiente, En evaluación, En proceso, Observado, Adjudicado,
  Contratado, Finalizado, Anulado.
- **Tablero de indicadores**: total de expedientes, activos, vencidos / por
  vencer y monto total por moneda.
- **Buscar** por código, objeto, proveedor o responsable.
- **Filtrar** por prioridad y estado.
- **Ordenar** haciendo clic en el encabezado de cualquier columna.
- **Alertas de vencimiento**: las filas vencidas se resaltan y se avisa cuando
  un expediente vence en 3 días o menos.
- **Exportar a CSV** (se abre directamente en Excel).
- **Importar desde CSV** (para cargar varios expedientes de golpe).

## Importar desde Excel

1. En Excel, arma una tabla cuya **primera fila** tenga estos encabezados
   (mínimo `codigo` y `objeto`):

   ```
   codigo, objeto, proveedor, area, responsable, monto, moneda,
   prioridad, estado, fechaIngreso, fechaLimite, observaciones
   ```

2. Guarda como **CSV (delimitado por comas)**.
3. En la app, pulsa **Importar** y selecciona el archivo.

Las fechas se aceptan como `AAAA-MM-DD` o `DD/MM/AAAA`. Si `prioridad` o `estado`
no coinciden con los valores válidos, se asignan `Media` y `Pendiente`.

## Dónde se guardan los datos

Los expedientes se almacenan en el **`localStorage`** del navegador donde abres
la app. Eso significa que:

- Son privados de ese equipo y navegador.
- Se conservan aunque cierres la pestaña.
- **No** se sincronizan entre computadoras. Para mover/respaldar datos, usa
  **Exportar** e **Importar**.

## Archivos del proyecto

| Archivo       | Contenido                                  |
|---------------|--------------------------------------------|
| `index.html`  | Estructura de la página                     |
| `styles.css`  | Estilos y diseño visual                     |
| `app.js`      | Lógica: registro, filtros, CSV, almacenado  |
