# Alcance de rendimiento de las versiones seleccionadas

Revisión sobre9a1050d76. No sumar ni comparar directamente los tiempos de escenas distintas. Las36parejas visuales de este directorio NO son benchmarks. Todos los estudios siguientes usan Intel UHD0x9A60/ANGLE D3D11 a1280x720; sus cámaras, estados y alcance difieren.

|Bioma|Evidencia útil|Qué demuestra / qué excluye|
|---|---|---|
|Sabana|[Horizonte elevado](../sabana-horizon-raised-cost-20261023/README.md)|ABAB medio, cámara baja móvil,720GPU válidas. Variante12.0–12.8msdía/12.6–13.0msnoche; estado pausado, variaciones pequeñas de carga. No FPS de partida activa ni ahorro atribuible al horizonte.|
|Gran Río|[Horizonte elevado](../gran-rio-horizon-raised-cost-20261023/README.md)|ABAB medio,720GPU válidas; variante12.8–13.7msdía/13.7–14.2msnoche, deriva temporal y carga ligeramente diferente. No optimización demostrada.|
|Manglares|[Medio activo](../holly-fern-approved-active-cost-20261023/README.md), [bajo activo nuevo](../holly-fern-approved-active-low-cost-20261023/README.md)|Dos repeticiones por perfil, simulación activa, cámara móvil; cada estudio360GPU válidas. Medio intervalos34.9–39.4ms; bajo23.2–28.7ms, p95bajo31.7–35ms. No A/B de estado final idéntico ni30fpsestables; bajo sacrifica sombras/densidad.|
|Gran Cañón|[Agua calmada](../canyon-day-reflection-cost-20261023/README.md)|ABAB medio,720GPU válidas, cámaras y cargas exactas; candidato13.8–14.1msdía/14.4–15.0msnoche. Residentepaused/fijo/syncChunks suspendido: no streaming/simulación.|
|Desierto|[Perfiles reproducibles](../desert-populated-frozen-cost-20261022/README.md)|Medio/bajo/medio/bajo,720GPU válidas, recursos/carga repetibles; coste bajo menor con diferente calidad. Cámara fija, pausado/residente; conservar sombras aprobadas en medio.|
|Volcanes|[Medición actual](../volcanes-allocation-aware-cost-20261022/README.md), [atribución del culling](../volcanes-instance-culling-review-20261023/README.md)|720GPU válidas, repeticiones exactas dentro del perfil. Diferencia histórica de triángulos explicada por cullingdeproducción. Deriva diurna4.168ms; no atribuirla a optimización. Pausado/residente.|

No se ha demostrado que todos los biomas cumplan un mismo presupuesto en partidas avanzadas activas, streaming y cámaras equivalentes. Las excursiones activas existentes sirven para errores/continuidad visual, no convierten automáticamente sus vídeos en benchmarks fiables. Tampoco puede compararse directamente con main sin declarar que su perfil lejano está desactivado con Wild Engine.

Recomendación actual: conservar las versiones nativas seleccionadas y la calidad media artística; ofrecer baja como alternativa visualmente reducida, sin venderla como rendimiento equivalente. Mantener el LODpreiluminado de helechos como candidato de cámara elevada: su mejoraGPU13–15%diurna no representa una optimización global aprobada y falta suavizar su transición. Priorizar la revisión de huecos concretos de validación, no repetir los benchmarks estáticos ni descartar arte solo por coste.

Este índice delimita evidencia, no certifica cierre de los seis biomas ni aprobación de PR159. El próximo informe global debe unir estas limitaciones con las excursiones/horizontes y distinguir problemas reproducidos de dudas históricas ya resueltas.
