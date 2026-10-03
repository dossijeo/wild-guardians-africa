# QA-115 / QA-120 — duración visual, anochecer y carga

WorldScene y navegación nativos, Sabana/Mapungubwe, semilla 712. Se pagaron centro (800), tres mijos (15) y un hombre mayor (100): saldo 85. La preparación declara día 5 y hora 295, con una noche sin incursión; no acredita una campaña natural hasta día 5. Las tres áreas están separadas y se activan mediante `Game.cast`. No se escriben ranuras.

| Tiempo simulado desde lanzamiento | VFX activos | Recargas Escudo / Crecimiento / Multiplicar |
| --- | --- | --- |
| 0 | Tres | 90 / 90 / 120 |
| 5, anochecer | Tres | 85 / 85 / 115 |
| 10 | Tres | 80 / 80 / 110 |
| 15 | Escudo y Crecimiento | 75 / 75 / 105 |
| 20 | Crecimiento | 70 / 70 / 100 |
| 25 | Crecimiento | 65 / 65 / 95 |
| 30 | Ninguno | 60 / 60 / 90 |

Se inspeccionaron las capturas de los efectos activos, el mundo recreado y las expiraciones. Los efectos continúan más allá de los cinco segundos de demostración y se retiran en su límite lógico. La etapa nocturna conserva el crecimiento de los tres cultivos. Cada render deja idéntico el snapshot del dominio.

A los 10 segundos se entrega un delta real de 60 s a `Game.advanceReal` bajo pausa bloqueante: snapshot idéntico, sin avance de efecto ni recarga. Es una comprobación del delta de reloj, no una espera de 60 s de pared. Después se deserializa y se recrean **Navigation y WorldScene**: snapshot idéntico, edades VFX iguales dentro de 1e-7 s, mismos conteos de sprites/sólidos. No se afirma igualdad de todos los píxeles; sombras y presentación de una escena nueva producen diferencias.

La consola conserva advertencias ANGLE X4000 del HDR y registra cero errores. Las 15 pruebas de VFX y las 47 de reloj/kernel/preview pasan. La nueva prueba de Escudo contrasta agricultura con un control sin campo, atraviesa anochecer usando día ×1/noche ×5, pausa, carga, expiración y recarga completa; acredita activación nocturna permitida. Las pruebas anteriores de Crecimiento/Multiplicar verifican su rechazo nocturno sin mutación.

Ese ensayo encontró un residuo de aproximadamente 1e-12 s al cumplir exactamente el cooldown. `Game.tick` ahora lleva a cero valores inferiores al mismo epsilon de reloj (1e-9), permitiendo el lanzamiento a los 90 s exactos. Commit `f257d74`.

Reproducir las capturas: `/tests/browser/spell-duration-world.html`, activar, avanzar en pasos de cinco segundos, probar pausa y recreación a los diez segundos. Verificar los informes guardados: `python docs/qa/spell-durations/verify.py`.
