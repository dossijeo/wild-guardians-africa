# Roca volcánica: respuesta solar cálida

Ensayo QA del suelo, sin cambiar props, texturas, normales, geometría ni sombras. Multiplica únicamente biomeDirect en Volcanes por una respuesta cálida1,35/1,03/0,70 ponderada por normal al sol, inverso de ceniza y1-uNight. La ceniza pura queda excluida; las mezclas reciben contribución parcial. Reutiliza qaAsh calculado en el material, sin otra lectura de textura. No se cambia la receta original por defecto.

Doce capturas reales media1280x720, semilla712, tres cámaras día/noche, elapsed/simElapsed2. Cámara, hora, draws y triángulos coinciden en las seis parejas; sin errores de página/GL. Noche: las tres parejas son RGB exactas. Día:312992/134351/298034píxeles distintos, MAE0,681/0,279/0,446 sobre255, delta máximo22/19/25. Cambiar píxeles no demuestra mejorar el volumen.

Inspección de la vista normal: se percibe una calidez tenue en algunas caras, pero no se recupera la estructura de planos del mockup. Las áreas lisas y el relieve de escala pequeña siguen dominando. **No integrar como solución de volumen.** Conservar fuente y capturas como referencia de color; no descartada por rendimiento. No realizar benchmark de una receta que no satisface el objetivo artístico. El coste temporal no está medido; solo se verifica que no añade geometría/draws/texturas.

Siguiente paso: revisar escala física y estructura mesoscópica del material rocoso frente a la máscara de ceniza. No aumentar arbitrariamente normalBoost ni abandonar ceniza para llenar todo de ruido. Mantener las siluetas originales y validar cualquier propuesta desde cámara normal y cercana.

[Comparativa normal](day-0-pair.webp), [nocturna](night-0-pair.webp), [cámaras y contadores](captures.json), [diferencias RGB](comparison.json). Reproducir con node tools/experiments/capture-volcanic-solar-rock.mjs, Vite5190. Las transformaciones de source se aplican solo en las páginasQA candidatas.
