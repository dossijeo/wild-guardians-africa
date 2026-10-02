# Mapa nativo de contacto del terreno

El rasterizador de Bioma Lab V4 conserva sus 256×256 píxeles R8, grupos,
pesos, radios limitados a 0,5–9 y composición por mínimo. La hierba y los
grupos desactivados no estampan contacto. Los radios se recuperan de las
dimensiones originales completas, independientemente del LOD visible.

WorldScene recoge las instancias realmente residentes, excluyendo las
retiradas por construcción. Una revisión de chunks y sus límites invalida
el mapa al viajar o reconstruir; un frame estático no cambia la textura.
Se conserva un único recurso de 64 KiB, sin mipmaps, filtrado lineal y sin
conversión de color. Residentes y horizonte comparten samplers/límites; el
shader devuelve AO 1 fuera de ellos. El recurso se libera al cerrar el mundo.

El AO vuelve a modular el ambiente y el reflejo físico de `nativeGroundLight4`,
según la fuente. Se conserva el comportamiento del shader cel entregado:
`africanToon4` utiliza ese `lit` en la rama de terreno húmedo; las bandas cel
secas calculan su color sin ese término. No se añade un oscurecimiento final
distinto del shader. El mapa nativo comprende props del bioma, no edificios
del poblado, cultivos, trabajadores o bestias.

Regresión completa: 548/548, sin fallos, omisiones ni cancelaciones, en
248,861 s (`test-results/tests-contacts-full.txt`). Después se amplió
el contraste de radios a los 120 LOD completos y se repitieron las dirigidas.
Pruebas dirigidas finales: 27/27 en 4,793 s, sin omisiones. Comparación byte a
byte contra el rasterizador original en los seis biomas, tres regiones y dos
selecciones de capas; hierba, radios, solapamientos, eliminación y streaming.
Comprueban además ownership, filtros, samplers Basic/Standard y actualizaciones
durante streaming real de WorldScene. La primera regresión encontró tres
fixtures de descarga sin el nuevo componente; se corrigieron las fixtures
y se conserva el informe inicial `tests-contacts-initial.txt`.

Build aprobado en 18,34 s; paquete web: 547 archivos / 379.366.538 bytes /
791 enlaces relativos / 20 GLB de ejecución, sin duplicados originales.
CI anterior `c477fe6` aprobada en la ejecución 37034277319.

CUA de seis biomas con WorldScene, Mapungubwe/712: manglar día, cañón alta,
desierto muy baja, Gran Río y Volcanes día, Sabana noche. Sin errores WebGL
ni errores/avisos en los logs consultados. En manglar, retirar un prop y
viajar sube el contador de actualizaciones de 1 a 2 y 3, conservando 65.536
bytes. Capturas `test-results/contact-*.png` y estados `contact-browser.json`.
Con props ocultos solo en el visor y cámara fija, alternar contacto cambia
611 de 640.000 píxeles de terreno: diferencia máxima de 5 por canal. Es un
aporte sutil; no una comparación de píxeles entre renderers ni una campaña.

Quedan emisión volcánica específica de props, LOD/batching/worker/origen
flotante, rendimiento móvil y otros requisitos del Plan Maestro. Esta
revisión sustituye el `objAO=1` de la anterior QA de iluminación del terreno;
no acredita la implementación completa ni el conjunto de aceptación.
