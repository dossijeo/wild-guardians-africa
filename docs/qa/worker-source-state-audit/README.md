# Estado observado del trabajador original

Diagnóstico nativo desde IAB, fuente congelada c340c8cf del subagente. Solo original YoungMale: Sabana, día, Idle en fracción 0, azimut 8.23131151293202°, elevación −15°. Se conserva la pose reservada V1 como diagnóstico de fuente; no se usa para entrenar una reparación ni se modifica el modelo. La suite principal 44690 había terminado con 3142/3142; cuatro campañas CPU históricas seguían activas. No se mide rendimiento.

Treinta repeticiones comparadas con el primer dibujo alternan 0 o 21 bytes distintos, diferencia máxima 59 y sin cambios alpha. No se ejecutó ningún brazo candidato (samples vacío). El comparador registra un dibujo observado de Mesh0 por repetición y un programa. Coinciden los campos capturados de programa, uniformes, estado, atributos, texturas/bindings, matrices y boneTexture. Las huellas de 25 geometrías fuente al principio/final coinciden. La consola registrada no contiene warnings/errors.

Esto no prueba que todos los texels GPU —incluidos shadow maps— ni estados no observados sean iguales. Los fingerprints FNV no son criptográficos. Las consultas de GL pueden perturbar la ejecución y no sirven como benchmark. La igualdad observada acota la investigación, pero no identifica una causa ni valida el candidato, la matriz V1, una categoría o FrontSide.

Se guardan reporte completo, análisis, comparador, consola, captura del navegador e imagen de comparación retenida después de liberar GPU. El subagente recibe la evidencia y continúa aislando evaluación/rasterización/captura y contenido no observado. No se promueve ningún asset de su rama.

```powershell
node docs/qa/worker-source-state-audit/verify.mjs
```

El verificador comprueba integridad y coherencia del archivo. No vuelve a renderizar ni prueba causalidad.
