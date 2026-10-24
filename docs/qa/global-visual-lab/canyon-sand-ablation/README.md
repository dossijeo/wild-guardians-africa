# Diagnóstico de crestas de arena

18 capturas reales: material completo / normal plana / color medio, tres cámaras cercanas, día/noche, media1280×720, seed712. Cámara, hora, llamadas y triángulos iguales, sin errores. Se inspeccionaron los trípticos cercanos diurno y nocturno.

[Completo / normal plana / color medio, día](day-triptych.webp) · [Noche](night-triptych.webp)

La normal plana reemplaza únicamente el normal map de arena por (0,0,1). Color medio sustituye el mapa Diffuse por su media RGB cruda (0.56913064,0.52422576,0.47915630), conservando pigmento y normal. La media no garantiza luminancia final idéntica por la no linealidad del shading, pero evita elegir un tono arbitrario. Grava y mezcla permanecen.

Las crestas claras en sombra desaparecen con normal plana y permanecen con color medio. La normal participa en el efecto; esto por sí solo no distingue iluminación difusa, especular o sesgo de sombras. El [ensayo siguiente](../canyon-sand-reflection/README.md) aísla reflexión ambiental. No adoptar normal plana: borra el volumen buscado. No se mide rendimiento de ablaciones que eliminan rasgos; no son optimizaciones equivalentes.

```powershell
node tools/experiments/capture-canyon-sand-ablation.mjs
python tools/experiments/package-canyon-sand-ablation.py
```

Vite5190. Opciones flatNormal/flatColor falsas por defecto. PNG fuente locales, trípticos y trazas publicados. Sin cambios de producción, modelos ni main.
