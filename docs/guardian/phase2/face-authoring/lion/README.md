# León: calibración anatómica y candidato mandibular

Estado: **en elaboración; no instalado en el juego**. Fuente activa conservada:
`539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb`.

## Actualización: candidato v9

### Avance posterior v12: exportación y prueba en Three.js

La auditoría dental encontró una deformación del 16.25% en aristas del colmillo
inferior izquierdo: se le aplicaba el gradiente de la mejilla. Ahora todos los
dientes inferiores reciben la misma rotación mandibular. Error máximo a apertura
completa: 0.0264% (aristas pequeñas en coordenadas float32). A media apertura
queda una contracción máxima del 2.003%, propia de interpolar linealmente un giro
de 0.4 radianes. No se afirma rigidez exacta durante todo el recorrido.

La primera exportación falló la comparación de clips: reducía 96 muestras/s a
24, con diferencias de hasta 6.77 cm y 0.404 rad. El importador también colocaba
los strips en el fotograma 1, desplazando 31.25 ms los clips a 96 Hz. Se conservan
ahora tanto 96 Hz como el inicio original en el fotograma 4 (1/24 s), antes de
importar. Los seis clips / 78 huesos / 246 poses pasan con error máximo de
posición 0.000002763 m y de ángulo 0.000007763 rad.

**Validación visual animada FALLIDA, integración pendiente:** el GLB v12 se ha
ejecutado en Three.js mediante `actor-expression.html?actor=lion`. Carga y recibe
el morph en tres primitivas, pero a `Running=0.35 s` y boca `0.85`, la lengua y
los dientes se separan del labio inferior. La cavidad sigue `Head`; los pesos
originales del hocico se reparten entre varios huesos. La auditoría específica
de 1.050 vértices del núcleo del hocico mide hasta 0.061232 m respecto a `Head`
en los clips originales. Conservar los huesos no valida la unión de la piel.
La captura `v12-running-mouth-misalignment.png` documenta el fallo; no se ha
instalado el candidato. Siguiente corrección: reconciliar el skinning oral y del
hocico, preservando collar, melena y transiciones, y repetir la misma pose.

El visor incorpora selección del candidato de león, seguimiento de rostro y
tiempo manual de clip para reproducir el problema. El parpadeo del león continúa
pendiente, como indica su etiqueta. Los seis tests del controlador facial pasan;
no prueban la calidad visual ni corrigen el fallo anterior.

Se corrigió la alteración exterior restringiendo la soldadura a la región oral.
La copia soldada para estudiar conectividad es ahora desechable. El comparador
de caras distingue orientación y UV para no confundir triángulos coincidentes:
14.723 caras / 44.169 esquinas fuera de la región de edición conservan posiciones,
UV y pesos con error máximo cero. La diferencia máxima de componentes de las
normales es 0.0003252; la puerta permite 0.001. El render neutral vuelve a
conservar el aspecto de los ojos. Esto no prueba los clips ni la región editada.

Se añadió una cavidad con paladar, suelo, paredes laterales, fondo y lengua con
volumen, además de dentición procedural original (sin recursos externos).
La entrada frontal permanece abierta. Añade 1.450 vértices, 1.310 caras de autoría
y un material; no son todavía recuentos de triángulos/draw calls del GLB final.
El primer interior sobresalía por la comisura izquierda; se estrechó y retranqueó.
Los primeros dientes también aparecían en neutral. El candidato v9 calcula el
retranqueo contra la superficie real mediante rayos y desplaza cada pieza entera,
en lugar de deformarla o suponer simetría. Guarda esas distancias en el informe.

Se han revisado los renders v9 de frente cerrado y abierto y ambos perfiles
abiertos. Ya no aparece el colmillo fuera del labio en el frente neutral. Quedan
pendientes el recorrido completo, la legibilidad/equilibrio de ambos colmillos,
la auditoría dental durante interpolación, clips y Three.js. No se ha instalado
este candidato ni se declara terminada la boca. Las capturas v2 se conservan
como diagnóstico histórico; las nuevas llevan prefijo v9.

Se han renderizado el original y dos candidatos en Blender 4.5.3. Las referencias
frontales y laterales muestran la línea labial bajo las almohadillas del hocico,
por encima de la barba blanca. Los colmillos colgantes pertenecen a los adornos;
no se han tratado como dientes de la boca. El inventario topológico encuentra
una pequeña frontera de cinco vértices junto a una comisura, no una abertura
dental completa como la de la hiena.

`landmark-pixels.json` contiene puntos seleccionados visualmente en los renders;
`landmarks.json` conserva sus intersecciones 3D reales con el modelo, cara y hash.
Son referencias de autoría, no una segmentación automática aprobada. El perfil
de corte actual se ha ajustado al lateral y requiere revisar su correspondencia
frontal fina. El corte no es un plano horizontal por el mentón.

El candidato v2 abre la mandíbula 0.4 radianes, con transición hacia las
comisuras, y mantiene la barba unida a la mandíbula. Se han inspeccionado frente
y ambos perfiles a apertura completa y el frente neutral. No tiene todavía
paladar, suelo oral, lengua ni dentición nueva: se ve la cara interna de otras
superficies originales. No se ha añadido una cortina negra para ocultarlas.

La primera reconstrucción alteró el sombreado de zonas ajenas a la boca. El
candidato v2 transporta las normales originales por esquina a través de BMesh.
Mejora el sombreado, pero aún se aprecia una diferencia alrededor de los ojos
incluso en neutral; queda pendiente aislar normales, soldadura y pesos antes de
aprobar la conservación del original. No se considera una corrección terminada.

Pendiente: resolver esa diferencia, terminar la cavidad anatómica, comprobar
0/25/50/75/100%, invariancia de UV/accesorios/pesos, clips originales, exportación
GLB y ejecución real con ataque, impacto, caída y recuperación. El parpadeo del
león tampoco está implementado todavía. Estas capturas no prueban integración
ni rendimiento en Wild Engine.

Reproducción actual desde la raíz del worktree, sustituyendo `blender` por su ejecutable:

```powershell
blender --background --python-exit-code 1 --python tools/guardian/prototype_lion_jaw.py -- --input public/assets/539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb --output C:/tmp/guardian-faces/lion-jaw-v9.blend --oral-cavity
blender --background --python-exit-code 1 --python tools/guardian/inspect_actor_face.py -- --input C:/tmp/guardian-faces/lion-jaw-v9.blend --output C:/tmp/guardian-faces/lion-jaw-v9-1 --center 0 -.23 1.55 --extent .24 --expression mouthOpen --amount 1 --samples 8
blender --background --python-exit-code 1 --python tools/guardian/audit_lion_untouched_surface.py -- --source public/assets/539e240badbd4705dd44b299b6c163c050c6dca388d9d25dc10688c88e0b4968.glb --candidate C:/tmp/guardian-faces/lion-jaw-v9.blend --output C:/tmp/guardian-faces/lion-v9-surface-audit.json --check
```
