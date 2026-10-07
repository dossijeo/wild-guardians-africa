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

**Esta entrega verifica únicamente las poses y la carga de recursos.**
El informe tiene `view:null`: la GPU no se inicializa al cargar o comparar.
Los botones de caminar/correr/ataque preparan una comprobación visual con
AfricanToon, sombras nativas y suelo plano QA. Esa fase y sus capturas siguen
pendientes; la pestaña se conserva para continuar cuando termine la secuencia
GPU del subagente de impostores. No se da por probada la compilación del shader
en esta nueva fixture ni la colocación visual de los modelos.

El ensayo no acredita rendimiento, RAM física, móvil, todos los biomas,
terreno inclinado real o pasos dentro del río. La prueba Node anterior cubre
adicionalmente modelos sin padre y registra sus propios límites.

`syntax.json.gz` verifica136 páginas/135 scripts, incluida esta fixture;
`provenance.json` fija fuentes y cinco GLB runtime. `hashes.json` fija informes
y documentos. Ningún código de producción cambia en esta entrega.
