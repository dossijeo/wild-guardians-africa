# Protección de cámara sobre terreno nativo

Se recuperan los límites de Bioma Lab V4: inclinación polar 0,065–1,47,
distancia de intención 4–min(65,20/max(0,19,cos(phi))), punto de mira en
surface +0,18 y posición final entre surface +2 y surface +20 bajo la cámara.
X/Z y azimut siguen sin un límite finito. El encuadre inicial conserva
0,50/1,16/38; en cañones, 0/1,18/34. Estas son unidades del lab.

WorldScene aplica la protección después de actualizar los controles y antes
de streaming, selección/render y VFX. Enfocar un aviso/poblado y los gestos de
murallas usan el mismo adaptador. Enfocar consume primero la inercia pendiente
para evitar que un arrastre anterior desplace el destino nuevo. La posición
mira de nuevo al punto de interés y actualiza su matriz antes del dibujo.

La elevación final puede aumentar la distancia real a un objetivo situado
muy abajo: esto también ocurre en el lab. Por eso el adaptador conserva la
posición de intención previa al clamp vertical y la entrega a OrbitControls
en el siguiente frame. No convierte una corrección de altura en otro giro o
zoom; una edición externa real de posición/objetivo sí se procesa.

Los gestos y su amortiguación siguen en OrbitControls; no se afirma identidad
del easing o de todas las entradas con el controlador DOM del lab. El FOV de
la integración permanece en 42 grados. La protección evita una cámara bajo
la superficie del terreno; no resuelve obstáculos entre cámara y objetivo,
ni oculta árboles/edificios. Esos requisitos siguen pendientes, junto con
horizonte, materiales completos, rendimiento móvil y otros del Plan Maestro.

Pruebas: 360 combinaciones de bioma/objetivo/inclinación/distancia contrastan
la pose instantánea con updateCamera original (tolerancia 1e-9 por orden de
operaciones). Raycasts contra la malla Float32 real en seis biomas y chunks
negativos verifican la separación del suelo. La regresión de pared usa
OrbitControls real sin DOM durante 200 frames; pruebas adicionales verifican
viaje lejano, matriz de mirada, selección antes del próximo frame, cambio
externo, inercia y estado de simulación
sin cambios. Pasan 26 pruebas dirigidas, incluidas terreno, cielo y manos.
CI anterior 53a6634 aprobada en 37021313570.

Regresión integrada: 524/524 en 277,872 s, sin fallos ni omisiones. Después
se añadió la protección inmediata de selección y su regresión; las 26
pruebas dirigidas finales pasan en 5,458 s. La suite integrada registrada
precede ese último caso de selección. Build final aprobado en 4,52 s y
paquete web aprobado con 547 archivos, 791 enlaces relativos y 20 GLB runtime.
Informes `test-results/tests-terrain-camera-full.txt` y
`test-results/tests-terrain-camera-directed.txt`.

CUA con WorldScene real, Mapungubwe/712/calidad media: recuperación tras forzar
la cámara 50 unidades bajo surface, seguida de diez renders por bioma. Los
seis casos mantuvieron idéntica posición a seis decimales, altura dentro del
intervalo y cero errores WebGL/avisos de consola. Informe
`test-results/native-camera-browser.json` y siete capturas
`test-results/native-camera-*.png` (cauce inicial y seis recuperaciones).
La vista de Manglar sigue parcialmente tapada por vegetación; la ocultación
automática sigue pendiente. No acredita los treinta mundos en todas las
calidades, todos los gestos táctiles ni el rendimiento móvil.
