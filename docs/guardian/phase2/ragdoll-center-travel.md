# Recorrido físico: referencia antes de ajustar el impulso

Comando: `node tools/guardian/measure_actual_ragdoll.mjs docs/guardian/phase2/ragdoll-center-travel-baseline.json`.

Se usan los cinco GLB actuales, sus pesos y colisionadores ajustados a la piel, en pose de reposo, sobre suelo plano y durante 360 pasos a 60 Hz. El centro se calcula con la masa y el centro de masa mundial de cada cuerpo rígido. Se separa del recorrido de la pelvis, que cambia también al girar o caer. Las mediciones de CPU son exclusivamente Node, no rendimiento del juego.

| Especie | Horizontal: centro de masa | Lateral: centro de masa | Observación |
| --- | ---: | ---: | --- |
| Hiena | 1,97 m | 1,47 m | Lateral no alcanza reposo en 6 s |
| Jabalí | 1,14 m | 0,75 m | El recorrido depende de la orientación |
| León | 0,67 m | 1,87 m | Descendente no alcanza reposo en 6 s |
| Búfalo | 1,88 m | 1,16 m | La masa por sí sola no predice el recorrido final |
| Rinoceronte | 1,04 m | 0,65 m | Lateral se estabiliza a los 5,58 s |

No se ha cambiado el impulso. Aumentar globalmente su velocidad no está justificado por estos resultados: algunos casos ya rozan 2 m y otros presentan falta de reposo. La comparación previa del desplazamiento de pelvis no bastaba para validar la resistencia por especie.

El controlador real fuerza la transición a recuperación al superar cinco segundos aunque el solver no indique reposo. Es un mecanismo de salida, no evidencia de estabilización física. Se debe inspeccionar en pantalla la transición en estos tres casos antes de aprobarla.

Siguientes comprobaciones necesarias: captura de poses de caminar/atacar del juego, escala y orientación reales, plano y pendiente, impacto lateral/descendente, contacto de piel y articulaciones, continuidad al levantarse. El ensayo actual no sustituye esas comprobaciones ni prueba los 1–2 m durante una incursión.
