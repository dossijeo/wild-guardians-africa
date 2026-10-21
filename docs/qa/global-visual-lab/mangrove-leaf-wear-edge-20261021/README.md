# Transición de hojas por desgaste

Control: crecimiento por cobertura. Candidata: además multiplica crecimiento por 1-smoothstep(0.03,0.25,wear). Reutiliza coverageData.w, antes humedad no consumida por el shader; no añade atributos ni muestras de textura. Mantiene exactamente las exclusiones y posiciones: reduce las hojas hacia el interior del borde, sin extender cobertura sobre caminos.

Seis parejas reales, Manglares media, semilla 712, 1280×720, cámaras normal/elevada/cercana y día/noche. [Día](comparison-day.jpg), [noche](comparison-night.jpg). El límite del parche resulta menos abrupto, con musgo visible entre hojas pequeñas antes de desaparecer. Conserva volumen en el interior. Mantener candidata QA, no declarar resuelto todo el contacto con suelo: bordes de agua/ocupación, mezcla cromática y movimiento siguen pendientes.

Verificados cámara, target, hora, near/far, triángulos y memoria de buffers iguales. Sin errores. 92088/112256/114736 triángulos de cobertura, dos draw calls,1203376 bytes de atributos e índices. Sin nuevos pases ni alpha blending. No tiempos GPU/CPU de benchmark ni ganancias FPS demostradas; cambia el área rasterizada. Persisten límites de streaming y LOD del prototipo estático. No integrada en producción.

Reproducción: node tools/experiments/capture-mangrove-leaf-wear-edge-20261021.mjs; python tools/experiments/package-mangrove-leaf-wear-edge-20261021.py. Vite 5190. Metadatos y láminas publicados; PNG completos regenerables.
