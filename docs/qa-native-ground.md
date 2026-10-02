# Terreno nativo de Bioma Lab V4

WorldScene recupera las 48×48 celdas por chunk de 48 unidades y su diagonal
original. Los vértices usan lattice, groundColor y las normales originales:
suavizado por diferencias de altura en cuatro biomas, normales de cara para
cañones y suavizado específico del desierto. Conserva el buffer Float32
intercalado de posición/normal/color, trasladado al centro mundial del chunk.

Se retira la paleta sinusoidal provisional. Los colores RGB originales se
convierten a lineal antes de African Toon. Se mantienen el shader aportado,
sus detalles de terreno y la adaptación de luces/sombras; esta revisión no
afirma igualdad de píxeles con el renderer WebGL del lab.

El apoyo de VFX, escombros y el recorte de manos usan triángulos de una unidad.
Las pruebas cubren 36 combinaciones de bioma/semilla/chunk y comparan todos los
bytes de vértices, colores y normales contra la receta extraída de forma
independiente del HTML. Raycasts contrastan el apoyo en los seis biomas, a
ambos lados de diagonales y en chunks negativos. Se conserva la protección
de manos frente a crestas interiores y la de escombros frente al terreno.

Pasan 38 pruebas dirigidas y la regresión integrada 519/519, sin fallos,
omisiones ni cancelaciones, en 260,204 s. Informes:
`test-results/tests-native-terrain-directed.txt` y
`test-results/tests-native-terrain-full.txt`. Build aprobado en 6,31 s;
paquete web aprobado: 547 archivos, 791 enlaces relativos y 20 GLB de runtime.
CI anterior 8ce040a aprobada en 37019894682.

CUA con WorldScene real, Mapungubwe/712: seis biomas de día en calidad media,
cañón también de noche y desierto en muy baja (Basic, sin sombras).
Capturas `test-results/native-ground-*.png`. El visor consulta getError tras
dibujar; las vistas aprobadas indicaron cero errores y las consultas de
consola no devolvieron errores ni avisos.

«Ver relieve nativo» enfoca el cauce o el terreno próximo del desierto. Su
cámara elevada permite inspeccionar el cañón: la primera aproximación baja
quedó dentro de una pared. Solo se ajusta el visor de QA; la protección de
cámara en la partida sigue pendiente.

Siguen pendientes horizonte/streaming lejano (se ven bordes de chunks
cargados), materiales completos de props, ocultamiento automático,
rendimiento móvil y otros requisitos del Plan Maestro.
