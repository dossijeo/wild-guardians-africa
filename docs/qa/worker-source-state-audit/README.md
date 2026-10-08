# Estado observado del trabajador original

Diagnóstico nativo desde IAB, fuente congelada c340c8cf del subagente. Solo original YoungMale: Sabana, día, Idle en fracción 0, azimut 8.23131151293202°, elevación −15°. Se conserva la pose reservada V1 como diagnóstico de fuente; no se usa para entrenar una reparación ni se modifica el modelo. La suite principal 44690 había terminado con 3142/3142; cuatro campañas CPU históricas seguían activas. No se mide rendimiento.

Treinta repeticiones comparadas con el primer dibujo alternan 0 o 21 bytes distintos, diferencia máxima 59 y sin cambios alpha. No se ejecutó ningún brazo candidato (samples vacío). El comparador registra un dibujo observado de Mesh0 por repetición y un programa. Coinciden los campos capturados de programa, uniformes, estado, atributos, texturas/bindings, matrices y boneTexture. Las huellas de 25 geometrías fuente al principio/final coinciden. La consola registrada no contiene warnings/errors.

Esto no prueba que todos los texels GPU —incluidos shadow maps— ni estados no observados sean iguales. Los fingerprints FNV no son criptográficos. Las consultas de GL pueden perturbar la ejecución y no sirven como benchmark. La igualdad observada acota la investigación, pero no identifica una causa ni valida el candidato, la matriz V1, una categoría o FrontSide.

Se guardan reporte completo, análisis, comparador, consola, captura del navegador e imagen de comparación retenida después de liberar GPU. El subagente recibe la evidencia y continúa aislando evaluación/rasterización/captura y contenido no observado. No se promueve ningún asset de su rama.

```powershell
node docs/qa/worker-source-state-audit/verify.mjs
```

El verificador comprueba integridad y coherencia del archivo. No vuelve a renderizar ni prueba causalidad.

## Aislamiento sin sombras

La sonda original c340 no enumeraba SAMPLER_2D_SHADOW; su igualdad de bindings no cubría el sampler de comparación de profundidad. Se amplía la observación en 3cb4b1df y se guarda en no-shadows. La revisión anterior también corrige el nombre del hash en manifest: sourceSha256 identifica el asset fuente del catálogo, no el script del trabajador.

Treinta controles de la misma pose, con shadowsEnabled false y uNativeShadowOn efectivo0, vuelven a alternar0/21 bytes, máximo59 y alpha0. Un dibujo Mesh0 por repetición mantiene los campos capturados iguales y registra ahora uNativeShadowFiltered como SAMPLER_2D_SHADOW35682, compareMode34894, compareFunc515 y textura/sampler efectivo. No se leen texels GPU. No se compara candidato y se libera GPU al terminar. La consola de esta variante contiene un warning X4000 de posible variable no inicializada en f_environment4; se conserva y requiere inspección, sin atribuirle todavía la variación.

Esta observación descarta las sombras como explicación exclusiva en esa fixture, sin probar una causa de la variación ni aceptar V1. Siguen pendientes evaluación/rasterización/captura y estados/contenido no observados. Inventario de campaña actualizado20024/49032/41320/41304, suite completa ya terminal. No es un benchmark.

```powershell
node docs/qa/worker-source-state-audit/no-shadows/verify.mjs
```
