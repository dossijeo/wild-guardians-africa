# Primer control nativo de subconjunto cerrado de trabajador

Fuentes del subagente congeladas para el despacho en `998d8e34`; ninguna integración de modelos en main. Browser IAB, dos comparaciones separadas: repack de fuente sin cambios y candidato con cinco mallas rígidas FrontSide. Pose Carry_Crate 0,90625, Sabana/día, azimut144,375°, elevación67,5°, imagen1024px por brazo.

Los dos informes conservan controles originales repetidos exactos, IoU1, MAE RGB0, tile0, ninguna diferencia del shadow map empaquetado. Ambos brazos envían20 llamadas y65662 triángulos contando sombras; estos contadores no miden ahorro GPU. Tres mallas de caja seleccionadas estaban visibles; las dos de azada no lo estaban. El cuerpo ya era FrontSide en producción.

**Prueba local de entrenamiento, no aprobación.** El conjunto usa8640 triángulos existentes, pero no significa que todos contribuyan en esta pose. Resto de accesorios DoubleSide y normales originales; las sombras seleccionadas siguen DoubleSide. Mantiene la receta DOUBLE_SIDED en el shader de color seleccionado. Faltan multivista, doce clips, biomas/culturas, sombras FrontSide y benchmark GPU AB/BA neto antes de promover. No se afirma reparación completa de trabajadores ni beneficio de rendimiento.

Suite CPU40124/session46954 y campañas43808/49032 estaban vivas. Sin timing GPU. Control no mostró warnings/errors; Front mostró warning del compilador `f_environment4` potencialmente sin inicializar. No se deduce su causa ni un fallo de imagen, pues controles originales son exactos en esta muestra; requiere investigación antes de aceptación.

La captura exportada `comparison.png` contiene original, candidato y diferencia×8. El servidor guarda la PNG aparte y elimina capturePng del JSON. Solo se retuvo la PNG del último ensayo Front; la del control fue sobrescrita. El screenshot de la UI queda vacío tras forceContextLoss: se comunicó al subagente para conservar la comparación estática. Las etiquetas candidateSide del JSON aún son genéricas por una asignación posterior; materialSides/effectiveShadowDraws muestran los lados reales. Estos defectos de observabilidad quedan registrados, no se interpretan como defectos del juego.

## Reproducción

Con el servidor del subagente en5284, abrir primero y pulsar «Ejecutar comparación reservada»:

```text
/tests/browser/frontside-worker-visual.html?sourceRepackControl&clip=Carry_Crate&withheldV6&caseOffset=13&limit=1&cpuCampaigns=43808%2F49032-active
/tests/browser/frontside-worker-visual.html?closedSubset&clip=Carry_Crate&withheldV6&caseOffset=13&limit=1&cpuCampaigns=43808%2F49032-active
```

Guardar el JSON y PNG antes de abrir el siguiente, pues el endpoint los sobrescribe. Manifest registra hashes/condiciones. `node docs/qa/worker-closed-subset-first-screen/verify.mjs` comprueba esta evidencia; no vuelve a renderizar ni declara aceptación.
