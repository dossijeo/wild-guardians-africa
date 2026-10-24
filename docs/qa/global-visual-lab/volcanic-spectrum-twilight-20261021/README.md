# Volcanes: relleno cromático durante el crepúsculo

30 capturas,15 parejas:3 cámaras y5 niveles nocturnos0,.25,.5,.75,1. Campaña real pausada,semilla712,media,1280×720. Control:ambiente nocturno integrado. Candidata:color menos azul del experimento spectrum. Izquierda control,derecha candidata.

Auditoría sin errores:cámara,objetivo,hora,uNight,draw calls ytriángulos iguales. Las3 parejas diurnas son exactas. En cámara normal,MAE aumenta0→.313→.673→1.096→1.600 niveles RGB hacia noche;esto describe progresión de imagen,no calidad artística ni ausencia de saltos entre muestras.

- [25% noche](quarter-0-pair.webp)
- [50% noche](half-0-pair.webp)
- [75% noche](threequarter-0-pair.webp)
- [Noche](night-0-pair.webp)

La vista50% revisada conserva roca oscura y lectura de fracturas,con cambio cromático discreto. Conservar candidata. No se ha revisado vídeo continuo ni amanecer inverso en esta ronda;faltan perfil bajo,benchmark y revisión global antes de promoverla. No se añaden geometría,texturas ni muestras;no afirmar por ello coste temporal cero.

```text
node tools/experiments/capture-volcanic-spectrum-twilight-20261021.mjs
python tools/experiments/package-volcanic-spectrum-twilight-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main y comportamiento predeterminado intactos.
