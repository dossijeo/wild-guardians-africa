# Reflejos HDR del shader cel en materiales del mundo

Se extrae literalmente `environment4` del fragment African Toon V4.1.4
suministrado por el usuario. La dirección reflejada se transforma a UV
equirectangulares con el giro común del cielo; rugosidad selecciona LOD
`rough*7`. Se recupera radiancia multiplicando por 4 los entornos comprimidos,
y se mezclan día/noche con el relleno nocturno original (0,025/0,045/0,10).
La radiancia se entrega directamente a `africanToon4`, con su graduación propia.

Los materiales MeshStandard que reciben el cel del mundo comparten las dos
texturas 256×128 ya creadas desde los HDR. Esto incluye props, trabajadores,
bestias, poblados y otras mallas que usan ese camino de material. No se
genera PMREM, otro asset ni otra curva tonal. Normales y rugosidad de los
props usan los atlas recuperados. La fase nocturna sigue el reloj simulado;
girar el cielo actualiza el muestreo incluso en materiales ya compilados.
Los uniformes mantienen identidad al activar/desactivar o sustituir entornos.
Sky conserva la propiedad y liberación de las dos texturas.

Los ShaderMaterial de DEST/escombros y otros shaders propios todavía no
reciben este enlace HDR. El suelo MeshBasic de muy baja conserva su camino
sin reflexión; los props MeshStandard sí lo mantienen, como en eco del lab.
La exposición y el cálculo completo de iluminación/terreno, AO de contacto,
emisión volcánica específica, móviles y demás requisitos aún necesitan
comprobaciones. Este cambio no prueba fidelidad completa del renderer.

Pruebas: función GLSL idéntica al original; combinación de muestras HDR,
normales, rugosidad, cel y cobertura; uniformes compartidos día/noche/giro;
activación después de compilar sin clonar texturas ni cambiar el programa.
Pasan 13/13 dirigidas en 1,492 s, build en 5,92 s y paquete web:
547 archivos / 379.359.468 bytes / 791 enlaces relativos / 20 GLB de ejecución.
CI de atlas anterior 2c41ec7 aprobada en 37029729443.
Regresión completa: 542/542, sin omisiones, en 249,293 s.

Manglar compara la misma cámara, fase y pose con HDR activado/desactivado
y giro de 90°. La comparación excluye los controles (región y>=180):
619.881/691.200 píxeles cambian al retirar HDR, diferencia absoluta media
15,476 por canal; 659.964 cambian al girar, media 4,671. Estas medidas prueban
que la radiancia llega al render, no que cada píxel sea fiel al lab original.
Capturas, métricas y estados en `test-results/native-reflection-*`.

CUA: seis biomas con cultura Mapungubwe y semilla 712. Manglar incluye
activación, giro y noche; Volcanes transición 0,5000; Cañón alta y viaje con
descarga; Desierto muy baja; Sabana y Gran río media. Todos registran cero
errores WebGL y de consola. Esta matriz visual no acredita todas las culturas,
recorridos ni rendimiento de dispositivos móviles.
