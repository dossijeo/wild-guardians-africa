# Streaming de la opción canyonSand

Comparación directa entre receta interceptada QA (original) y opción integrada canyonSand=1 (candidate). Ambas son arena normal-only; no compara arena contra grava.

36 capturas/18 parejas, Gran Cañón semilla712, media1280×720, día150/noche350. Dos circuitos por fase con saltos de192 unidades, nueve paradas,16 cambios de origen por variante. Cámaras, objetivos globales, chunks, draw calls y triángulos iguales; regresos0/4/8 al mismo punto verificados. Sin errores registrados. Warm-floor QA en ambas para conservar condiciones anteriores.

**10/18 parejas RGB exactas.** Otras ocho:1–7 píxeles distintos por imagen; máximo delta10/255 en pareja nocturna1 (cinco píxeles), resto máximo1. MAE máximo0.00001013/255. La aserción inicial de igualdad exacta falló y se sustituyó por registro de diferencias, sin borrar el fallo ni aplicar una tolerancia que lo convierta en paridad exacta. Causa de residuos no aislada. [Registro de diferencias](parity.json).

La tira de regresos diurna integrada inspeccionada conserva depósitos y relieve. Diferencia respecto al primer encuadre al volver: MAE0.001901/255 día en ambas rutas; noche0 o0.000000362. Son imágenes tras asentamiento, no continuidad durante desplazamiento. [Día](candidate-day-returns.webp) · [Noche](candidate-night-returns.webp).

Ambas texturas adicionales emiten dispose una vez al ejecutar world.dispose; listas vacías y objeto dispuesto. Los programas acaban en36 en ambas. Contadores de recursos publicados no equivalen a VRAM ni certificación de ausencia de fugas durante partidas largas. settleMs incluye carga y renders de asentamiento, no benchmark de fotograma.

Conservar opción experimental desactivada por defecto: validación de carga y cierre integrada favorable en estos circuitos, con residuos de paridad explícitos. No demuestra transición temporal continua ni cambia el sobrecoste cercano previamente medido. Sin cambios de main, simulación o modelos.

## Reproducción

```powershell
node tools/experiments/capture-canyon-sand-integrated-streaming.mjs
python tools/experiments/package-canyon-sand-integrated-streaming.py
```

Vite5190. [Capturas y auditoría](captures.json), [resumen](summary.json), [cierre integrado](media-candidate-disposal.json). PNG fuente locales; tiras y registros publicados. El script verifica igualdad de escena y registra diferencias RGB, no exige ahora igualdad exacta de imagen.
