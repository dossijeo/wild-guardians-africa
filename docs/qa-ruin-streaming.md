# QA-086: ruinas, streaming y recarga

**Verificado** en WorldScene completo con terreno, props, edificios y muro
nativos Sabana/Mapungubwe, semilla 712, calidad media. El preparador aislado
`tests/browser/ruin-streaming.html` no utiliza almacenamiento del usuario.
Desde un crédito QA explícito de 10000 monedas, coloca mediante comandos reales
dos centros (800 cada uno) y un muro de adobe (35): saldo final 8365.
El segundo centro queda operativo para que destruir el primero no termine la partida.

El daño se aplica con `hitStructure` por toda la salud de los dos objetivos.
Después se ejecuta Game.tick hasta superar sus tiempos de caída (centro 3,2 s,
muro 1,4 s). Ambos terminan con estado ruined y HP 0. Sus puntos centrales,
antes bloqueados, pasan a ser transitables y no figuran como obstáculos.

La cámara se aleja 2048 m en ambos ejes. Los 25 chunks iniciales se descargan:
ninguna clave del conjunto lejano coincide con el inicial. Se vuelve a la misma
cámara y se regeneran los 25 chunks originales. La serialización de toda la
partida permanece idéntica antes de alejarse, estando lejos y al regresar;
no aparecen colisiones ni estructuras intactas.

Finalmente se destruye el renderer, se deserializa el snapshot, se crea una
Navigation nueva y un WorldScene nuevo y se cargan otra vez los assets/chunks.
El snapshot resultante es idéntico byte por byte al anterior. Centro y muro
siguen en ruinas, sus puntos son transitables y sus obstáculos no reaparecen.
Se ve la ceniza del centro y el escombro nativo de adobe.

[Reporte público completo](qa/ruin-streaming/final-report.json),
[comparación independiente](qa/ruin-streaming/comparison.json), snapshots
[anterior](qa/ruin-streaming/ruins-snapshot.json) y [recargado](qa/ruin-streaming/reloaded-snapshot.json),
imágenes [antes](qa/ruin-streaming/ruins-before.png),
[tras regresar](qa/ruin-streaming/ruins-return.png) y
[tras recargar](qa/ruin-streaming/ruins-reloaded.png).
[Consola](qa/ruin-streaming/console.json): vacía.

En el reporte, `rendered` significa que existe el objeto en el registro
`world.objects`, no que se dibuje desde la cámara lejana. La implementación
descarga chunks de terreno/props; conserva los objetos de estructuras y aplica
su descarte por visibilidad. No se afirma que sus recursos se descarguen con el
terreno ni se acredita aquí memoria constante para una finca grande (QA-158).
La recarga completa sí reconstruye sus objetos desde el snapshot. No se exige
igualdad de cada partícula/píxel: la evidencia acredita estado, ruina y colisión.

El primer intento del preparador esperó dos segundos y falló la comprobación
de final de colapso del centro. Se corrigió el ensayo para esperar el mayor
tiempo pendiente más 0,1 s; las duraciones del juego no se cambiaron. La evidencia
final de ruinas procede de una ejecución nueva con esa espera correcta.

## Corrección visual de la previsualización

Las capturas anteriores mostraban un preview muy oscuro pese al texto «verde»:
el material temporal seguía usando el atlas de la defensa y la iluminación de
un material Standard, además de proyectar/recibir sombras. Ahora usa un material
Basic verde translúcido independiente, sin escritura de profundidad ni sombras.
Conserva la geometría nativa, lados y polygonOffset; la defensa comprada conserva
su textura y material original. Se dispone el material clonado anterior y el
material temporal se libera al borrar el preview.

[Imagen](qa/ruin-streaming/preview.png) y [reporte](qa/ruin-streaming/preview-report.json):
preview de adobe verde translúcido al lado del muro comprado, con serialización
idéntica antes/después, sin cobro. La comprobación pública del preparador verifica
Basic, transparencia, color 9cb67b y ausencia de castShadow/receiveShadow. Esa
captura corresponde a la fase de preview del primer preparador, anterior a su
fallo de espera; el material de producción es el mismo en la ejecución final.
La revisión visual directa es adobe de día; no se presenta como una captura
de todos los materiales en todas las horas.

Pasan **24/24 pruebas dirigidas**, cero fallos u omisiones, 301,9795 ms:
Toon, caché de sombras y trazados nativos. [Salida](qa/wall-preview-directed.txt).
Build pasa en 5,36 s; conserva el aviso de tamaño de bundle. Paquete web:
559 archivos, 379.783.691 bytes, 796 enlaces relativos, 20 GLB de runtime y
ningún duplicado original.
