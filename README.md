# PRIORITY · Seguimiento de Requerimientos · Logística UPROG

Aplicación web para hacer seguimiento a los **requerimientos / expedientes** que
ingresan a UPROG, mapeados por **prioridad** y **estado**, con todos los datos de
cada expediente. Pensada sobre la estructura real de la hoja de control mensual.

No requiere instalación ni internet: es HTML + CSS + JavaScript puro y los datos
se guardan en tu propio navegador.

## Cómo usarla

1. Abre el archivo **`index.html`** (o el único archivo `PRIORITY.html`) con doble clic.
2. Pulsa **"Cargar mis datos de JUNIO (50)"** para tener tus requerimientos de junio cargados de una vez.
3. Empieza a actualizar prioridades, estados y a registrar nuevos.

## Campos de cada requerimiento

Basados en tu hoja "JUNIO MEJORADO":

- **N°** (correlativo, se autocompleta)
- **Fecha de ingreso a UPROG**
- **N° Exp. Logística** y **N° Exp. Dirección**
- **N° de documento del área que solicita** (ej. NOTA INFORMATIVA N°…)
- **Área usuaria estratégica** y **Área usuaria**
- **Tipo** (Bien / Insumo / Servicio / Activo no financiero / Paciente)
- **Denominación del requerimiento** (completo) e **Ítem** (resumen corto)
- **Especialista a cargo** y **Fecha de pase a especialista**
- **Estado del requerimiento**: Pendiente, Disponibilidad presupuestal, Invitación,
  Cuadro comparativo, Validado, Entregado a Grisel, Para saldo
- **Prioridad**: Alta / Media / Baja
- **¿Tengo el expediente físico?** (Sí / No)
- **Observaciones**

## Funciones

- **Tablero** arriba: total de requerimientos, prioridad más alta, sin expediente físico y pendientes.
- **Buscar** por expediente, documento, área, denominación o especialista.
- **Filtrar** por estado, prioridad, tipo y si tienes o no el expediente.
- **Ordenar** haciendo clic en cualquier encabezado de columna.
- **Antigüedad en UPROG**: muestra los días desde el ingreso y resalta los que llevan más de 30 días.
- **Exportar a CSV** (se abre en Excel) e **Importar CSV**.
- Los datos quedan guardados en tu navegador (no se borran al cerrar).

## Configurar tus listas (⚙ Configurar)

Las listas de **Estados**, **Tipos** y **Prioridades** son totalmente editables desde
el botón **⚙ Configurar**:

- **Agregar** nuevas opciones (ej. un nuevo estado "En firma").
- **Renombrar** una opción; por ejemplo si "Entregado a Grisel" pasa a otra persona,
  la cambias y **todos los requerimientos que la usaban se actualizan solos**.
- **Reordenar** con ↑ ↓ (en Prioridades, la primera es la más urgente).
- **Cambiar el color** de cada etiqueta.
- **Eliminar** opciones (los requerimientos que la usaban quedan con ese campo en blanco).
- **Restaurar** los valores por defecto cuando quieras.

La configuración también se guarda en tu navegador.

## Respaldo y traslado de datos

Los datos se guardan en el navegador de **esa** computadora. Para respaldarlos o
pasarlos a otra PC: usa **⬇ Exportar** (te baja un CSV que abre Excel) y, en la otra
máquina, **⬆ Importar**. El importador reconoce tanto el CSV exportado por la app
como columnas con los mismos nombres.

## Archivos

| Archivo        | Contenido                                   |
|----------------|---------------------------------------------|
| `index.html`   | Estructura de la página                      |
| `styles.css`   | Estilos y diseño visual                      |
| `app.js`       | Lógica: registro, filtros, CSV, datos de junio, almacenado |
| `PRIORITY.html`| Versión todo-en-uno (los 3 anteriores en un solo archivo) |
