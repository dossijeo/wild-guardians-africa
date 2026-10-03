# Descarte de centros con caída nativa

Publicado `21b5491`: outer, interior, ceniza y máscara de apertura vuelven a usar
frustum culling. Cada mesh tiene una esfera local propia, sin cambiar los buffers
compartidos ni la receta del shader. La ceniza usa una envolvente independiente.

La envolvente estable incluye el retranqueo interior de .21 y el límite del suelo.
Al comenzar el movimiento de caída se usa una envolvente conservadora calculada
una vez por cultura: la rotación preserva distancia al anclaje; se añaden los
máximos de desplazamiento lateral (.72 por eje), caída (1.22 × altura del anclaje)
y suelo (.035–.08), con margen 1e-4. Cubre todos los valores de t entre cero y uno.
La esfera estable se recupera al reparar. El cálculo rechaza cambios desconocidos
en las operaciones del shader nativo, cuya fuente sigue intacta.

## Pruebas

- Cinco modelos originales, todos los vértices exteriores e interiores, daño
  0/.79/.8/.85/.9/.95/1, comparados con el colapso del kernel original.
- Ceniza en cuatro escalas de crecimiento, selección de esfera estable/caída,
  reparación y descarte de un centro lejos de cámara.
- Un centro fuera del frustum de cámara sigue dentro de un volumen de luz distinto:
  el descarte no cambia `visible` ni usa la cámara de color para excluir sombras.
- La caché detecta cambios en esferas de geometría y esferas por objeto aunque
  no cambien las matrices ni los buffers, y reutiliza frames estables.

[Suite completa](qa/center-bounds/tests.txt): 635/635, ninguna omitida.
[Pruebas dirigidas](qa/center-bounds/targeted.txt): 24/24, incluida la comprobación
adicional del volumen de luz. [Build y paquete](qa/center-bounds/build.txt):
554 archivos, 379,667,459 bytes, 794 enlaces relativos, 20 GLB runtime.

## Navegador y límites

Fixture visual Sabana/Musgum/712, media, origen relativo 192/48. El control de
caída recorre los 3.2 segundos nativos y termina en ceniza/escombros. Es un fixture
que modifica la fase visual; no acredita la derrota por pérdida del último centro.
Con culling activo, [fase 84.25 %](qa/center-bounds/isolated-on.png) y
[ruina](qa/center-bounds/ruined.png) conservan las piezas observadas. Consola sin
errores ni avisos; estados guardados junto a las capturas.

La primera comparación cambia también la ocultación de un prop cercano, por lo
que no aísla los bounds (2,101 píxeles diferentes, máximo 55/255). Se repite con
ocultación desactivada y cámara/fase fijas: 1,677 píxeles diferentes, máximo 27/255
en 876,800 píxeles. Dos capturas con culling **desactivado** también difieren en
1,437 píxeles, máximo 27/255. Se preservan ambos resultados; no se atribuye su
causa ni se afirma identidad exacta. Esta vista incluye sombras y VFX de caída.

El valor PCF del informe se lee después de la pasada de humo, que temporalmente
desactiva sombras; no sirve para afirmar que el color se dibujó sin sombras.
La prueba no mide ahorro GPU/FPS ni cubre toda la matriz visual o hardware móvil.
La selección de lotes de props contra el volumen de luz sigue pendiente.
