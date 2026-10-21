# Arena completa frente a normal-only: coste incremental directo

A/original: arena seca con normales y color medio. B/candidate: misma receta con mapa de color. Ambas conservan normales, distribución, corrección especular, geometría, cámara y resolución. No se compara contra grava ni se restan medias de otras series.

Intel UHD0x9A60 ANGLE D3D11, Chrome headless WebGL2, baja1280×720, semilla712. A/B/A/B, día/noche;180frames de calentamiento y240muestras por bloque. GPU y CPU/cadencia separados, cámara móvil determinista, simulación pausada.1920 consultas GPU válidas y1920 frames de cadencia. Auditoría de dispositivo, estado, cámara y geometría coincidentes por índice; sin errores, disjoint o consultas descartadas/pendientes. [Datos](benchmarks.json), [resumen](summary.json).

| Fase GPU ms | Normal-only, dos bloques | Completa, dos bloques | B−A |
|---|---|---|---|
| Día |8.585 /7.257|7.290 /8.058|−1.295 /+.800|
| Noche |7.274 /7.225|7.430 /7.536|+.156 /+.311|

Noche muestra coste incremental moderado en ambos pares. Día inconcluso: diferencias de signo opuesto y variación del control. No afirmar aceleración de la versión completa ni ahorro estable de normal-only. Dos bloques no son intervalos de confianza; temperatura/carga ajena no controladas.

CPU render día3.157/3.260 frente3.104/3.271ms; noche3.082/3.349 frente3.098/3.356. Cadencia candidata~16.63ms,p95~17.0–17.2ms; control inicial diurno18.15ms,p9531.7ms. Cadencia no es presentación y puede quedar limitada por refresco; no demuestra coste cero. Uploads2.525/frame iguales, no todo tráfico GPU. Sin VRAM medida ni benchmark de pantalla ocupada por arena a primer plano.

## Revisión visual y recomendación

Se reinspeccionaron las [capturas normales/elevadas existentes](../../canyon-sand-normal-only/overview/README.md): completa a izquierda, normal-only a derecha (orden inverso al ensayo cercano reciente). Ambas mantienen lectura de ondulaciones; la textura completa añade variación fina, más sutil en estas vistas. La evidencia anterior ya existía: no se repitieron capturas solo para duplicarla.

Conservar completa como candidata artística viable; el coste nocturno directo no justifica abandonarla. No sustituir automáticamente la variante integrada todavía: faltan coste cercano directo y validación del material completo en la ruta integrada. La opción económica puede seguir siendo alternativa de perfil, sin afirmar igualdad visual. No hay aprobación del usuario de esta variante específica ni cambio en main.

```powershell
node tools/experiments/measure-canyon-sand-full-review.mjs
python tools/experiments/audit-canyon-sand-full-review.py
```

Vite5190. Esta serie evalúa render, no simulación ni rendimiento global de campaña. Objetivo de seis biomas pendiente.
