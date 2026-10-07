# Apoyo de bestias con los GLB runtime

Base de producción `7c4d3fe`. Navegador integrado, localhost5191, fixture
`tests/browser/animal-ground-comparison.html`, pestaña648. El loader de
producción carga los cinco GLB Meshopt de `assets/web/`, con sus texturas;
se conservan geometría, skins y animaciones runtime. Sin guardados ni cambios
de simulación. No se utiliza el modelo original sin comprimir de las pruebas
Node anteriores.

`comparison.json`:360 poses correctas,72 por especie, para caminar, correr y
los cuatro ataques. Se cambian escala del modelo, traslación, inclinación y
escala del padre, incluyendo coordenadas a4800m. El ajuste actual se compara
con la fórmula anterior de transformación a mundo y vuelta al padre. Máximo
error de altura2,274291865944633e-13m; tolerancia1e-9m. Cero errores declarados.
Las URL runtime y números de vértices de apoyo permanecen en el informe.

`comparison.json` conserva la comparación sin GPU (`view:null`). La fase
gráfica posterior se ejecutó en `431a882`, sin cambios en producción o fixture
respecto a los hashes registrados. [Caminar](walking.jpg), [correr](running.jpg)
y [ataque](attack.jpg) muestran las cinco bestias con sus texturas, AfricanToon
diurno y sombras nativas sobre suelo plano QA. Los tres informes JSON registran
`state:passed`, cero errores y `glError:0`; `console.json` no contiene avisos ni
errores. Las capturas son JPEG nativos de 1280×720, conservados sin recomprimir.

Son poses congeladas al 55 % de Walking, Running y Weapon_Combo_2. La cámara,
el suelo y las luces pertenecen a esta fixture; no se carga el mundo completo
ni el HDR de un bioma. Se inspeccionó la visibilidad, texturas y sombras, sin
comparación de píxeles contra el render anterior. El bucle de presentación
mantiene la imagen visible sin avanzar animación o simulación. La pestaña648
se cerró después de guardar los tres resultados y capturas, liberando la GPU.

El ensayo no acredita rendimiento, RAM física, móvil, todos los biomas,
terreno inclinado real o pasos dentro del río. La prueba Node anterior cubre
adicionalmente modelos sin padre y registra sus propios límites.

`syntax.json.gz` verifica136 páginas/135 scripts, incluida esta fixture;
`provenance.json` fija fuentes y cinco GLB runtime. `hashes.json` fija informes
y documentos, incluidos los resultados gráficos. Ningún código de producción
cambia en esta entrega.
