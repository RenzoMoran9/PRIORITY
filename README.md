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
> Pulsa **⋯ → 📖 Glosario** en la barra superior.

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
- **Estado del requerimiento**: sigue el flujo real de UPROG, paso a paso
  (ver la sección «Estados» más abajo). Puedes editar la lista en ⋯ → ⚙ Configurar.
- **Observaciones**: el texto se **ajusta y se ve completo** dentro de la celda; al
  editarla se abre un cuadro multilínea (Esc cancela, clic fuera guarda)
- **Prioridad**: Alta / Media / Baja
- **¿Tengo el expediente físico?** (Sí / No)

## Pestañas (tres hojas de trabajo)

La app tiene **tres pestañas**, como hojas de Excel:

- **Heredados**: los expedientes que venían de la persona anterior.
- **Mi trabajo**: lo que llevas tú ahora.
- **Terminados**: los expedientes ya cerrados, apartados para que tus dos
  pestañas de trabajo queden **más limpias**.

Cómo usarlas:

1. En **Heredados**, marca en la columna **A cargo = Sí** los requerimientos que estás viendo tú.
2. Pulsa **«⇄ Traer a mi trabajo»**: esos requerimientos se **mueven** a la pestaña «Mi trabajo».
3. Cuando pongas un expediente en estado **TERMINADO**, se **mueve solo** a la
   pestaña «Terminados» (al editar la celda Estado, en lote o al registrarlo). Si
   necesitas mover de golpe los que ya estaban en TERMINADO, usa **«📁 Archivar
   terminados»**. También puedes moverlos manualmente desde su celda **Pestaña**.
4. Los **nuevos** que te asignen los registras con **+ Nuevo requerimiento** (quedan en la pestaña activa).
5. Puedes **mover cualquier fila** entre pestañas editando su celda **Pestaña**.
6. **Doble clic** en el nombre de una pestaña para **renombrarla**.

Cada pestaña muestra su propio conteo y su propio tablero de indicadores, así que los
indicadores de «Heredados» y «Mi trabajo» **no cuentan** lo que ya está en «Terminados».

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
  celdas de color y bordes), con **una hoja por pestaña** (p. ej. «Heredados», «Mi trabajo» y «Terminados»),
  **fila de título fija** y **listas desplegables** en las columnas Pestaña, A cargo,
  Prioridad, Estado, Tipo y ¿Tengo exp.? (para elegir el valor dentro de Excel, igual que
  en la app). **Importar** acepta de vuelta ese mismo Excel sin perder a qué pestaña
  pertenece cada requerimiento (también lee CSV y exportaciones anteriores).
- Los datos quedan guardados en tu navegador (no se borran al cerrar).

> Para agregar un requerimiento nuevo usa **+ Nuevo requerimiento**; para modificar uno existente,
> edita directamente sus celdas en la tabla.

## Rapidez al llenar y consultar

- **⚡ Registro exprés** (botón arriba): una sola línea con lo esencial — Exp.
  Logística, documento, área, denominación y tipo. La fecha (hoy), el N°, la
  pestaña activa y «a mi cargo = SÍ» se ponen solos, y el área estratégica se
  copia del área usuaria. **Enter guarda y deja el cursor listo** para el
  siguiente. El resto se completa después directo en la tabla.
- **Tarjetas del tablero clickeables**: tocar «Sin expediente físico», «A mi
  cargo», «Prioridad alta» o «Pendientes» **filtra la tabla al instante**
  (segundo toque = quitar el filtro; «Total» limpia todo).
- **Navegación con teclado**: muévete por las celdas con las **flechas** y abre
  el editor con **Enter** (o F2), como en Excel. Esc quita el resaltado.
- **Frases rápidas en Observaciones**: al editar una observación aparecen
  botones con tus frases más usadas (aprendidas de tus propios datos, ej.
  «CUADRO COMPARATIVO», «ENTREGADO A GRISEL») y un botón **📅 fecha de hoy**;
  un toque y se insertan.
- **Historial de estados automático (🕘 en cada fila)**: cada cambio de estado
  se anota solo con fecha y hora. Toca 🕘 para ver el recorrido completo del
  expediente («PENDIENTE → INVITACION → …»).
- **⏸ Días sin movimiento**: si un requerimiento abierto lleva **7 días o más
  sin ninguna edición**, la celda de Estado lo avisa para que no se te duerma.

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

- **Predicción tipo teclado de celular (texto fantasma)**: mientras escribes en un campo
  de texto, la palabra probable aparece **en gris, pegada a lo que escribes** (aprendida
  de tus propios datos). La aceptas con **Tab** o **flecha derecha →** (ej. escribes
  "ADQUIS" y ves "ADQUIS**ICION**"; Tab la completa). Solo aparece al final de la línea.
- El formulario de «Nuevo requerimiento» además sugiere áreas y especialistas ya usados
  (lista desplegable del navegador).
- **Corrector ortográfico**: los cuadros de texto tienen activado el corrector del
  navegador en español (subraya errores y sugiere correcciones con clic derecho).

## Tema claro u oscuro

- Arriba, junto al zoom, hay un botón **🌙 / ☀** para cambiar entre **tema claro y
  oscuro**. Tu elección **queda recordada** en el navegador. La primera vez respeta
  el tema que use tu sistema operativo.

## Estados: 5 pasos, solo donde el expediente se queda esperando

| # | Estado | Qué significa | Depende de |
|---|--------|----------------|------------|
| 1 | PENDIENTE | Llegó el requerimiento; aún no lo empiezo | ⚪ por iniciar |
| 2 | INDAGACIÓN | Invito a los postores y espero sus cotizaciones | 🔵 mí |
| 3 | EN VALIDACIÓN | Entregado a Grisel → el área usuaria valida y devuelve | 🟠 otros |
| 4 | ESPERANDO PRESUPUESTO | Validado y registrado; en cola de presupuesto | 🟠 otros |
| 5 | TERMINADO | Llegó el presupuesto: certificas, entregas y se cierra (pasa solo a «Terminados») | 🟢 cerrado |
| — | OBSERVADO | Excepción: detenido, hay que corregir algo | 🔴 |

- **Botón ⏭** en cada fila: **avanza al siguiente paso** con un clic. En 4 clics
  repartidos en el tiempo un expediente recorre todo su ciclo. Queda anotado en
  el historial 🕘 y se deshace con Ctrl+Z. Se detiene en TERMINADO (OBSERVADO se
  elige a mano porque está fuera del flujo).
- Si vienes de una lista anterior, la app **convierte sola** tus expedientes
  (p. ej. Invitación → Indagación · Validado y Disponibilidad presupuestal →
  Esperando presupuesto · Entregado a Grisel → En validación · Cuadro comparativo y
  Certificando → Esperando presupuesto). Se actualizan también la papelera y el historial.
- ¿Necesitas más detalle en algún tramo? Agrega el estado que quieras en
  ⋯ → ⚙ Configurar listas: el botón ⏭ respeta el orden que definas.

## Vista de trabajo (reestructurada) y 👁 Columnas

El orden de columnas sigue tu flujo real: **N° → Exp. Logística → Ítem → Tipo →
Estado → Ingreso → Área → Documentos**. Además:

- **Ítem** muestra debajo, en gris, la **denominación completa** (clic en esa línea
  para editarla). **Área usuaria** muestra la estratégica solo cuando difiere.
- Las columnas heredadas del Excel anterior que hoy no aportan van **ocultas por
  defecto**: Pestaña, Prioridad, Área estratégica, Denominación, Especialista y
  F. pase. **Nada se pierde**: siguen en el formulario, en la búsqueda y en el
  Excel exportado, y se reactivan con el botón **👁 Columnas** (con «Vista
  recomendada» para volver al orden sugerido).
- **A cargo** aparece solo en «Heredados» (donde sirve para jalar los tuyos).
- **Prioridad** ahora se cambia con **un clic** en la celda: rota Alta → Media → Baja.
- **El Excel exportado NO cambia**: sale siempre con las 18 columnas, colores,
  hojas y desplegables de siempre, aunque en pantalla ocultes columnas.

## Diseño pensado para leer la tabla

- **Filas cebra**: las filas alternan un fondo muy suave para seguir la línea con
  la vista a lo ancho de las 19 columnas.
- **Columnas fijas**: la casilla de selección y el **N°** se quedan a la vista al
  desplazarte a la derecha — nunca pierdes de qué expediente estás leyendo.
- **Barra roja al inicio de la fila** = prioridad más alta; **barra naranja** =
  lleva más de 30 días abierto. Se ven incluso con la tabla desplazada.
- Las filas **a mi cargo** van con fondo azulado, distinto del resaltado del mouse.
- La barra superior agrupa los botones por función (vista · listas · Excel ·
  registrar) con separadores finos, y las tarjetas del tablero llevan icono.

## Pantallas pequeñas: zoom y barra fija

- **Zoom**: arriba a la derecha hay botones **−** y **+** para alejar o acercar la tabla
  (del 50 % al 130 %). El **%** central restablece al 100 %. El nivel queda recordado.
- **Zona superior anclada**: la cabecera, los indicadores, las pestañas y los filtros quedan
  fijos; al bajar con la rueda del mouse **no desaparecen**. Solo la tabla se desplaza por dentro,
  y su **barra de desplazamiento horizontal** (la que mueve de lado a lado) queda **siempre visible**
  en la parte inferior. Los **títulos de columna** también se quedan fijos al subir/bajar.

## Configurar tus listas (⋯ → ⚙ Configurar)

> La barra superior es minimalista: lo diario a la vista (zoom, tema, deshacer,
> **⬇ Exportar Excel**, **⚡ Exprés**, **+ Nuevo requerimiento**) y lo ocasional
> agrupado en el menú **⋯** (Glosario, Configurar, Vincular Excel, Importar).

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

## Consultar tus expedientes desde el celular (con Claude u otra IA)

La app vive en tu PC, pero puedes llevarte una foto de tu registro para
preguntarle a Claude «¿en qué va el expediente 2728?» desde cualquier lugar.

1. En la app: **⋯ → 🤖 Resumen para consultar con IA**. Baja un archivo
   `PRIORITY_estado_AAAA-MM-DD.md` con una **ficha por expediente**: estado,
   área, documento, días en UPROG, días sin movimiento, observaciones e
   historial de estados, además de un resumen por estado al inicio.
2. Sube ese archivo al **conocimiento de un Proyecto de Claude** (o guárdalo en
   Google Drive si tienes el conector activado).
3. Pregunta con normalidad: *«¿en qué va el exp 2728?»*, *«¿cuáles están
   esperando presupuesto?»*, *«¿qué expedientes llevan más de 30 días sin
   moverse?»*, *«¿cuáles no tengo en físico?»*.

### Que se mantenga solo al día (Google Drive)

Con **⋯ → 🔄 Vincular resumen (Drive)** eliges una vez el archivo `.md` y la app lo
**reescribe con cada cambio** que hagas. Si ese archivo está dentro de la carpeta de
**Google Drive para escritorio**, Drive lo sube solo y Claude siempre lee lo último,
sin que vuelvas a exportar nada.

1. Instala **Google Drive para escritorio** y espera a que aparezca su carpeta
   (por ejemplo `G:\Mi unidad`).
2. En la app: **⋯ → 🔄 Vincular resumen (Drive)** y guarda el archivo dentro de esa
   carpeta (p. ej. `G:\Mi unidad\PRIORITY\PRIORITY_estado.md`).
3. Activa el **conector de Google Drive** en Claude y pregunta lo que necesites.

El botón queda como **«🤖 Resumen vinculado ✓»** mientras el vínculo esté activo
(hay que volver a vincularlo cada vez que cierres y abras la app; es una medida de
seguridad del navegador). Requiere **Chrome o Edge**.

> Es una **foto del momento**, no una conexión en vivo: vuelve a exportar y
> reemplazar el archivo cuando quieras tenerlo al día (por ejemplo, al final de
> cada semana). Si lo guardas en Drive y lo reemplazas ahí, Claude siempre leerá
> la versión más reciente sin que tengas que volver a subirlo al Proyecto.

## Respaldo y traslado a otra PC

> **Importante:** tus datos NO están dentro de `PRIORITY.html`; se guardan en el
> navegador de esa computadora. Copiar solo el archivo te deja la app vacía.

**Para pasar todo a otra PC (recomendado):**

1. En la PC actual: **⋯ → 💾 Guardar copia de todo**. Baja un archivo
   `PRIORITY_copia_AAAA-MM-DD.json` con **absolutamente todo**: requerimientos,
   historial 🕘, papelera, pestañas, listas de estados/tipos/prioridades con sus
   colores, columnas visibles, tema y zoom.
2. Lleva ese `.json` **y** el archivo `PRIORITY.html` a la otra PC (USB, correo,
   Drive…). El `PRIORITY.html` también puedes descargarlo del repositorio.
3. En la PC nueva: abre `PRIORITY.html` y pulsa **⋯ → 📂 Restaurar copia**, elige
   el `.json` y confirma. La app se recarga con todo tal cual lo dejaste.

> Restaurar **reemplaza** lo que hubiera en esa PC, así que pide confirmación.
> Haz una copia cada cierto tiempo: también sirve como respaldo si se borra el
> navegador o falla el equipo.

**Alternativa parcial:** ⬇ Exportar Excel y ⬆ Importar en la otra PC traslada los
requerimientos (y su pestaña), pero **no** el historial, la papelera ni tus
preferencias de vista. Para una mudanza completa usa la copia `.json`.

### Nota

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
