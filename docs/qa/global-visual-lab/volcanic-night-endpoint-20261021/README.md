# Ambiente volcánico: corregir el extremo nocturno

Candidata corregida: mix(ambienteDía, ambienteNoche*1.65, uNight), exclusivamente en suelo mapeado de Volcanes. Control: mix(ambienteDía, ambienteNoche,uNight)*(1+0.65*uNight). Conserva los extremos, evita amplificar el componente diurno durante crepúsculo. Sin nuevas muestras, geometría ni pasadas. Objetos, sombras, AO y albedo intactos.

30 capturas reales, semilla712, media,1280x720, tres cámaras y uNight=0,.25,.5,.75,1 mediante el reloj real y skyNight.15 parejas verificadas: cámara, objetivo, hora, uNight, draws y triángulos coinciden, sin errores. Las seis parejas de los extremos día/noche son idénticas píxel a píxel. No se fuerza directamente el uniforme de noche.

[Transición al25%](quarter-0-pair.webp) · [Transición al50%](half-0-pair.webp) · [Transición al75%](threequarter-0-pair.webp). Control anterior izquierda; extremo corregido derecha. La comparación al50% revisada mantiene relieve y depósitos, con una atenuación ligera respecto al control. No equivale a evaluar un vídeo continuo ni un ciclo completo de amanecer.

Recomendación: usar la formulación corregida como candidata a integración opt-in; conservar el control para reproducibilidad. [Benchmark anterior](../volcanic-night-components-20261021/performance/README.md) midió la otra expresión en día/noche cerrada: no atribuir automáticamente sus tiempos a este shader. No hay beneficio FPS demostrado. Pendientes integración, rendimiento de la versión final, amanecer y horizonte/streaming. Objetivo global aún no alcanzado.

```text
node tools/experiments/capture-volcanic-night-endpoint-20261021.mjs
python tools/experiments/package-volcanic-night-endpoint-20261021.py
```

Vite5190. PNG locales,15 parejas y metadatos publicados. main intacta.
