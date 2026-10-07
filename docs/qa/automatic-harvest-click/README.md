# Cosecha automática sin clic de interfaz

Base `3e712e9`. El ensayo anterior de colapsos aceptó cuatro ui_click desde cuatro
solicitudes automáticas de cosecha. El dispatcher ahora consume el ID de esas
solicitudes sin reproducir un sonido. La solicitud sigue entrando en FIFO;
CropPicked, contactos físicos del trabajador y CrateDelivered conservan sus rutas.
Los eventos de solicitud manual de la API antigua mantienen su ruta compatible;
el gameplay actual genera solicitudes automáticas y no ofrece cosecha manual.

`tests.log.gz`:60 pruebas dirigidas correctas. La primera jornada con comandos
legales, terreno original y trabajador pagado produce una recolección y entrega
reales, cero clics y un cue de caja/venta cada uno. Se comprueba también el
historial rotatorio de2400 solicitudes automáticas/800 entregas y ausencia de
replay al parar/reemplazar/cargar historial. Dominio serializado sin cambios por
el audio; cuatro perfiles conservan sus contactos físicos en la suite existente.

Navegador integrado, localhost5191, Sabana/Mapungubwe seed712, calidad baja.
Fixture de32 brotes/8 trabajadores/3 centros, crédito QA10000, SFX silenciados y
precargados. Dos colapsos QA directos y uno tras daño animal; incursión dirigida
durante el día. Se añadió render0 por RAF **solo en fases detenidas de la fixture**:
`ready.png`/`final.png` ahora muestran mundo3D, sin avanzar simulación ni audio.
La captura vacía anterior permanece como evidencia histórica y no se sobrescribe.

`final.json`:50 riegos, cuatro maduraciones/cuatro HarvestRequested y cero
ui_click; incursión terminada,3 centros ruinados/2 colapsos simultáneos.
290 emisiones/290 contactos,6 fuentes043 y6 fuentes046 aceptadas,3 cues de
colapso. Pico19SFX,2 por emisor/4 por familia. Cero errores; cero voces y contexto
cerrado al terminar. No hubo entrega física antes del final de esta escena; la
entrega se acredita en la prueba dirigida de primera jornada, no en la captura.

En esta repetición se observó un pico de32 fuentes musicales y74876928 bytes de
PCM de ventanas, frente a16/37438464 en el ensayo anterior. No se atribuye esa
variación al cambio de dispatcher, ni se declara techo de memoria aceptado.
Revisar retención/solapamiento musical en sesiones más largas y medir RAM total;
la cifra del pool no incluye heap, SFX, geometrías ni texturas y no demuestra
cuántas capas serían audibles con ganancias reales.

Build225 módulos/19,66s correcto; advertencia preexistente de bundle grande.
Paquete641 archivos/382702474 bytes/859 enlaces relativos/20GLB sin duplicados
originales.133 scripts/134 páginas pasan sintaxis;550 ventanas musicales y126
SFX pasan verificación de hashes/exports. No acredita escucha, carga en frío,
FPS, móvil, noche natural o todos los biomas. Fuentes/informes/capturas fijados
en `provenance.json` y `hashes.json`.
