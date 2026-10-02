# Cel y entorno HDR de edificios DEST y escombros

El shader de cuerpo, interior y ceniza comparte los mismos entornos HDR que
los materiales cel del mundo. La dirección de reflexión local se transforma
con `mat3(uToonModel)` antes de muestrear el panorama: rotar una casa ya no
rota el cielo con ella. Mantiene normales, MR, recortes, deformación, emisión,
sombras y aperturas de DEST. La fuente de radiancia sigue `environment4`
del shader suministrado y los uniformes comunes de giro/activación.

Los escombros conservan posiciones, rotación, escala, color y física nativos.
Se pasan normal, posición y color base al fragment para recibir bandas cel
y reflexión HDR. Rugosidad 0,9 y visibilidad 1 corresponden a este material
mate sin mapa de sombras propio. Humo y sprites transparentes conservan
su iluminación y profundidad suave; no se convierten en superficies opacas.

La exposición de cel, DEST y renderer del mundo usa 1,0, como el estado del
lab de biomas; se retira el 1,15 de la integración previa. Los cielos conservan
sus exposiciones independientes 1,33/0,62. El diorama del menú tiene otro
renderer y conserva su implementación original.

Pruebas dirigidas: las cinco culturas comparten samplers/uniformes entre
cuerpo, interior, ceniza y escombros; la reflexión de una casa girada y
trasladada coincide con la calculada directamente en coordenadas del mundo.
La profundidad de sombras conserva el fragment original sin HDR. Pasan
22/22 dirigidas en 2,866 s, build en 7,62 s y paquete web:
547 archivos / 379.360.790 bytes / 791 enlaces relativos / 20 GLB de ejecución.
CI de reflejos anterior 65e3487 aprobada en 37030990452.

Siguen pendientes iluminación completa del terreno, AO de contacto, tratamiento
volcánico específico, LOD/batching/worker/origen flotante, dispositivos móviles
y otros requisitos. Esta revisión no acredita fidelidad completa del renderer
ni sustituye el test de campaña e interacción del Plan Maestro.

La regresión completa pasa 543/543 pruebas, sin omisiones, en 254,038 s
(`test-results/tests-dest-hdr-full.txt`). En el navegador se revisaron los
cinco centros en Sabana/712, con daño 0,417; los casos finales muestran
cinco escombros activos. Mapungubwe se comprobó además girado y de noche;
Saheliana en muy baja sin sombras, y Etíope en alta con 49 chunks.
El indicador WebGL registra cero errores y los logs consultados no contienen
errores ni avisos. Capturas `test-results/dest-hdr-*.png` y estados en
`test-results/dest-hdr-browser.json`. Es una fixture visual aislada sin
guardados, no una campaña ni una prueba de colapso completo o de móviles.
