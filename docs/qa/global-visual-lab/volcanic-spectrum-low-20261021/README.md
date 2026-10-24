# Volcanes: relleno nocturno en calidad baja

Seis parejas reales,semilla712,1280×720,calidad baja,tres cámaras,día/noche. Control:ambiente nocturno integrado. Candidata:color menos azul(.15,.22,.32),sin alterar multiplicador1.65. Izquierda control,derecha candidata.

Auditoría:cámara,objetivo,hora,draw calls ytriángulos iguales;sin errores. Las tres vistas diurnas son exactas. La normal nocturna revisada conserva roca oscura y mejora moderadamente la lectura de irregularidades. El perfil baja no representa las mismas sombras que media;no extrapolar a muy_baja.

- [Normal nocturna](night-0-pair.webp)
- [Elevada nocturna](night-1-pair.webp)
- [Inversa nocturna](night-2-pair.webp)
- [Normal diurna](day-0-pair.webp)

Conservar candidata QA. Esta ronda valida apariencia,no FPS,memoria física ni streaming. No añade muestras,texturas ni geometría,pero no se declara coste temporal cero. Pendientes benchmark y revisión conjunta antes de integrar.

```text
node tools/experiments/capture-volcanic-spectrum-low-20261021.mjs
python tools/experiments/package-volcanic-spectrum-low-20261021.py
```

Vite5190;archivar salidas antes de repetir. Main y predeterminado intactos.
