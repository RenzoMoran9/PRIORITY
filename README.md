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

> ¿No recuerdas qué significa cada Tipo, Estado u otro término (como "UPROG")?
> Pulsa **📖 Glosario** en la barra superior.

## Campos de cada requerimiento

Basados en tu hoja "JUNIO MEJORADO":

- **N°** (correlativo, se autocompleta)
- **Fecha de ingreso a UPROG**
- **N° Exp. Logística** y **N° Exp. Dirección**
- **N° de documento del área que solicita** (ej. NOTA INFORMATIVA N°…)
- **Área usuaria estratégica** y **Área usuaria**
- **Tipo** (Bien / Insumo / Servicio / Activo no financiero / Paciente). Junto al
  campo hay un ícono **ℹ** que explica el significado de cada uno al pasar el mouse
  o tocarlo:
  - **Bien**: objeto físico que se adquiere y se conserva (equipos, muebles, accesorios).
  - **Insumo**: material consumible que se gasta con el uso (descartables, reactivos).
  - **Servicio**: trabajo o mano de obra contratada, no es un objeto (mantenimiento, calibración).
  - **Activo no financiero**: bien de capital/patrimonial (SIGA/SIAF), equipo de valor
    significativo que se registra como activo fijo de la institución.
  - **Paciente**: requerimiento ligado a un paciente específico (compra puntual por
    indicación médica o urgencia).
- **Denominación del requerimiento** (completo) e **Ítem** (resumen corto)
- **Especialista a cargo** y **Fecha de pase a especialista**
- **Estado del requerimiento**: Pendiente, Disponibilidad presupuestal, Invitación,
  Cuadro comparativo, Validado, Entregado a Grisel, Para saldo, **Terminado**
  (puedes editar esta lista en ⚙ Configurar)
- **Observaciones**: el texto se **ajusta y se ve completo** dentro de la celda; al
  editarla se abre un cuadro multilínea (Esc cancela, clic fuera guarda)
- **Prioridad**: Alta / Media / Baja
- **¿Tengo el expediente físico?** (Sí / No)

## Pestañas (dos hojas de trabajo)

La app tiene **dos pestañas**, como hojas de Excel:

- **Heredados**: los expedientes que venían de la persona anterior.
- **Mi trabajo**: lo que llevas tú ahora.

Cómo usarlas:

1. En **Heredados**, marca en la columna **A cargo = Sí** los requerimientos que estás viendo tú.
2. Pulsa **«⇄ Traer a mi trabajo»**: esos requerimientos se **mueven** a la pestaña «Mi trabajo».
3. Los **nuevos** que te asignen los registras con **+ Nuevo requerimiento** (quedan en la pestaña activa).
4. Puedes **mover cualquier fila** entre pestañas editando su celda **Pestaña**.
5. **Doble clic** en el nombre de una pestaña para **renombrarla**.

Cada pestaña muestra su propio conteo y su propio tablero de indicadores.

## Funciones

- **Tablero** arriba (por pestaña): total, **a mi cargo**, prioridad más alta, sin expediente físico y pendientes.
- **Edición tipo Excel**: haz clic en cualquier celda y cámbiala ahí mismo (texto, fecha o lista
  desplegable). Se guarda al instante; no hay que abrir ninguna ventana ni usar lápiz.
- **A mi cargo**: marca con "Sí/No" los requerimientos que llevas tú (los demás son de otra persona)
  y usa el filtro **"A cargo"** para ver solo los tuyos, los de otra persona o los aún sin marcar.
- **Buscar** por expediente, documento, área, denominación o especialista.
- **Filtrar** por a cargo, estado, prioridad, tipo y si tienes o no el expediente.
- **Ordenar** haciendo clic en cualquier encabezado de columna.
- **Antigüedad en UPROG**: muestra los días desde el ingreso y resalta los que llevan más de 30 días.
- **Exportar a Excel con formato**: el archivo sale con las **mismas columnas, orden y
  colores** que la app (encabezado azul; prioridad/estado/tipo/«a cargo»/«¿tengo exp?» como
  celdas de color y bordes), con **una hoja por pestaña** (p. ej. «Heredados» y «Mi trabajo»),
  **fila de título fija** y **listas desplegables** en las columnas Pestaña, A cargo,
  Prioridad, Estado, Tipo y ¿Tengo exp.? (para elegir el valor dentro de Excel, igual que
  en la app). **Importar** acepta de vuelta ese mismo Excel sin perder a qué pestaña
  pertenece cada requerimiento (también lee CSV y exportaciones anteriores).
- Los datos quedan guardados en tu navegador (no se borran al cerrar).

> Para agregar un requerimiento nuevo usa **+ Nuevo requerimiento**; para modificar uno existente,
> edita directamente sus celdas en la tabla.

## Trabajo en lote, deshacer y papelera

- **Selección múltiple**: marca las casillas de la primera columna (o la casilla del
  encabezado para seleccionar todo lo visible). Aparece una barra para aplicar a todos
  los seleccionados de una vez: **cambiar estado, prioridad, pestaña, a cargo, asignar
  especialista o eliminar**.
- **↶ Deshacer (Ctrl+Z)**: revierte el último cambio (ediciones, lotes, eliminaciones,
  importaciones…), con varios niveles hacia atrás.
- **🗑 Papelera** (en el pie): los eliminados ya no se pierden; puedes **restaurarlos**
  cuando quieras. Por eso eliminar ya no pide confirmación fila por fila.
- **Aviso de duplicados**: si escribes un N° Exp. Logística que ya existe, la app te lo
  advierte al momento (y al registrar uno nuevo te pide confirmación).

## Ayudas de escritura

- **Sugerencias de valores ya usados**: al editar Área, Especialista, Doc. o Ítem, la app
  te muestra los valores que ya usaste para elegirlos con un clic (evita escribir distinto
  la misma área). El formulario de «Nuevo requerimiento» también sugiere mientras escribes.
- **Predicción de palabras**: en los campos de texto, la app aprende de tus propios datos
  y te sugiere la palabra que estás escribiendo (ej. escribes "ADQUIS" → sugiere
  "ADQUISICION"); púlsala con **Tab** para completarla.
- **Corrector ortográfico**: los cuadros de texto tienen activado el corrector del
  navegador en español (subraya errores y sugiere correcciones con clic derecho).

## Pantallas pequeñas: zoom y barra fija

- **Zoom**: arriba a la derecha hay botones **−** y **+** para alejar o acercar la tabla
  (del 50 % al 130 %). El **%** central restablece al 100 %. El nivel queda recordado.
- **Zona superior anclada**: la cabecera, los indicadores, las pestañas y los filtros quedan
  fijos; al bajar con la rueda del mouse **no desaparecen**. Solo la tabla se desplaza por dentro,
  y su **barra de desplazamiento horizontal** (la que mueve de lado a lado) queda **siempre visible**
  en la parte inferior. Los **títulos de columna** también se quedan fijos al subir/bajar.

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

## Conectar con Excel o con la nube (Supabase)

- **🔗 Vincular Excel**: en Chrome/Edge, vincula un archivo CSV que la app **actualiza
  solo** cada vez que editas; en Excel lo abres con *Datos → Obtener datos* y pulsas
  *Actualizar*. (Con doble clic `file://` puede estar bloqueado; ver detalles abajo.)
- **Supabase / nube / Excel en vivo / multi-dispositivo**: ver la guía completa en
  **[CONEXIONES.md](CONEXIONES.md)**.

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
