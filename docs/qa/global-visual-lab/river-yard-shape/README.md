# Gran Río: diagnóstico de ruta de máscara

**Ensayo visual no efectivo; no permite evaluar el borde irregular.** Se interceptó `ground-mask.js` para variar únicamente la distancia radial del claro exterior con ruido determinista de amplitud máxima 2.5 m. La fórmula de corredores y el núcleo quedaban intactos. Sin embargo, esta partida recibe bytes de máscara del núcleo espacial nativo: el generador JavaScript no calcula la textura usada.

## Evidencia

24 capturas reales, 12 parejas RGB exactamente idénticas (baja/media, día/noche, tres poses, semilla 712, 1280×720). Misma cámara, hora, llamadas, triángulos y buffers; sin errores. El empaquetador verifica imágenes sin pérdida. No interpretar esta ausencia de cambios como rechazo artístico de la hipótesis.

La ruta activa está en `src/world/wild-engine/spatial-savanna.cpp:buildGroundMask`, que combina el máximo de núcleos y corredores de los asentamientos cercanos. `spatial-core-worker.js` y `spatial-savanna-payload.js` copian los bytes de la memoria nativa. `BiomeGround.uniforms` usa `bytes??buildGroundMask417(...)`: cuando recibe bytes no llama al generador JavaScript. La cobertura experimental lee después la misma DataTexture residente que el suelo.

## Siguiente intervención

Aplicar un transformador QA sobre una copia de los bytes al entrar en BiomeGround, compartida por suelo y cobertura. Registrar un contador de máscaras y texeles modificados y exigir señal no nula antes de capturar una matriz completa. Mantener RGB, caminos, interiores y exclusiones de ocupación; usar coordenadas mundiales y validar solapes de chunks. No reimplementar silenciosamente la máscara nativa mediante el generador de un solo asentamiento: perdería la combinación de asentamientos cercanos.

No hay mejora incorporada ni benchmark: esta prueba diagnostica un punto de intervención inactivo. El prototipo queda separado y no se instala en producción.

Reproducir con Vite en 5190:

```powershell
node tools/experiments/capture-river-yard-shape.mjs
python tools/experiments/package-river-yard-shape.py
```

Capturas PNG y pares visuales locales; registros y código publicados. Las comparaciones son idénticas, por lo que no se añaden imágenes duplicadas al repositorio.
