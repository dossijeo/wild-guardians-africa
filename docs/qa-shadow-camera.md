# Cámara y resolución de sombras del terreno

La fuente Bioma Lab V4.0 `script-8.js` define dirección normalizada
`[-.82,.52,.31]`, foco X/Z redondeado a múltiplos de ocho y altura de foco cero.
`updateLight(150, focus)` encuadra ±75 en ambos ejes, con near 0,1 / far 540 y
ojo a 240 unidades en esa dirección. La integración anterior desplazaba la
luz cada fotograma con `[-30,55,25]`, foco a la altura del objetivo y una caja
±60 con profundidad por defecto. Ahora se conserva el contrato del lab en
la escena del juego; el diorama del menú mantiene su renderer independiente.

La calidad recupera 768 para eco, 1024 normal y 2048 alta. Los perfiles baja
y muy baja del juego conservan las sombras desactivadas: 768 es la resolución
configurada, sin asignar una textura hasta solicitar una pasada. Cambiar de
calidad libera el render target anterior y el auxiliar, y fuerza su creación
con el tamaño nuevo. En Three 0.180 cambiar solo `mapSize` no sustituye el
target existente. El cierre de la escena libera también los mapas de la luz.

Tres pruebas nuevas ejecutan las funciones originales `mm`, `lookAt` y
`ortho` contra las matrices de Three en objetivos positivos, negativos y
distantes; cotejan constantes y expresiones con la fuente. También comprueban
movimiento dentro de la cuadrícula, avance al borde, independencia de altura
del terreno y liberación única al cambiar de tamaño, conservando recursos
cuando la resolución no cambia. La regresión completa pasa 566/566 sin
omisiones en 258,700 s. El cambio final que libera el mapa al cerrar se
comprueba después en navegador y en la ejecución dirigida 19/19 (0,253 s).
Build final: 4,09 s; paquete web: 547 archivos / 379381974 bytes, 791 enlaces
relativos y 20 GLB de runtime, sin duplicados originales.

La GPU muestra 1024→2048→1024→2048 con el control diagnóstico de calidad,
incluidas las dos últimas transiciones sin recargar ni crear otro renderer.
En Sabana el objetivo `[199.594,12.251,35.350]` produce foco `[200,0,32]`;
viajar hasta `[-.774,3.160,83.350]` produce `[0,0,80]`. La consola no registra
errores ni avisos. La QA de los seis biomas usa Mapungubwe y calidades mixtas,
incluyendo daño DEST, agua de Manglares, noche volcánica y relieve de Cañones
y Desierto. Los artefactos están en `test-results/shadow-camera-*`.
El control «Siguiente combinación» cierra la escena de Cañones/Mapungubwe y
abre Cañones/Suajili; la casa de trabajo nativa de ocho unidades y los
personajes se vuelven a dibujar sin errores. La comprobación no mide memoria
GPU residente ni sustituye un diagnóstico prolongado de fugas.

Esta revisión acredita encuadre, dirección y resolución, no el filtrado
DEPTH_COMPONENT24/PCF con pendiente y polygon offset del renderer original:
Three conserva su mapa de profundidad codificada, PCFSoft y bias anterior.
Tampoco sustituye su política de actualización por la caché `shadowDirty`
del lab; actores, cosechas y destrucción siguen necesitando actualizaciones.
No acredita FPS, la matriz completa de culturas/calidades ni origen flotante.
El Plan Maestro sigue en curso.

Revisión posterior: profundidad DEPTH_COMPONENT24, PCF por pendiente y
polygon offset se integran en [QA de PCF nativo](qa-native-pcf.md). La descripción
anterior del filtro PCFSoft corresponde al estado de este commit de cámara;
la política de caché `shadowDirty` continúa pendiente.
