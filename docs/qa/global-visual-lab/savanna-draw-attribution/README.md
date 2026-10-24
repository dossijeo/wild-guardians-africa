# Atribución de geometría enviada en Sabana

Seis frames estabilizados: tres vistas, día/noche, baja, semilla712, cobertura C viento8. El hook QA envuelve renderBufferDirect y registra deltas reales de renderer.info con autoReset desactivado durante world.render. Restaura el método y autoReset en finally. No mide tiempos por draw ni añade consultas GPU.

La suma de todos los draws registrados coincide exactamente con los contadores completos en las seis vistas; sin errores GL registrados. En vista normal:

| Grupo | Draw calls | Triángulos |
| --- | ---: | ---: |
| Objetos MeshStandardMaterial | 57 | 1.185.224 |
| Terreno BiomeGround | 11 | 50.688 |
| Cobertura ligera | 1 | 39.008 |
| Cielo | 1 | 1 |

Los mayores draws pertenecen a native_merged_assets: el primero envía291.720 triángulos. Todos los draws observados se dirigen a pantalla; no se actualizó el shadow map en estos frames estabilizados. Esto no prueba que las sombras sean gratis durante movimiento ni que el porcentaje de triángulos equivalga a coste GPU.

El código de NativeAssetGroups descarta por volumen del chunk y agrupa todas sus instancias admitidas. Esa observación motivó el [prototipo conservador por instancia](../savanna-instance-frustum/README.md), que conserva modelos y sombras y evita enviar objetos totalmente fuera de pantalla. La atribución no cambia producción.

[Registro por draw y pose](captures.json), [sumas auditadas](summary.json).

Reproducir con Vite5190: `node tools/experiments/capture-savanna-draw-attribution.mjs`, después `python tools/experiments/audit-savanna-draw-attribution.py`. Capturas PNG locales no publicadas de nuevo: la escena corresponde al conjunto C documentado en el estudio enlazado; este entregable es el registro de envío.
