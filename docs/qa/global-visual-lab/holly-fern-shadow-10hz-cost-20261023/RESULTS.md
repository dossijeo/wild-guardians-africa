# Sombras de helechos a 10 Hz: camara fija

A: sombra continua. B: tiempo de viento de sombra cuantizado a 10 Hz. Color/viento visible sin cambios, ambas variantes con sombras 4096. Intel UHD,1280x720,calidad media,escena poblada pausada,fondo completo. Dos parejas A/B/A/B,60 warmup+90 muestras por pase, GPU y cadencia separados.

| Fase | GPU A/B ms | Deltas parejas ms | Cadencia A/B ms |
|---|---|---|---|
|day|26.38/21.96|-7.20/-1.64|28.08/24.39|
|night|25.95/25.23|-1.02/-0.42|28.11/26.65|

## Cache observada
- original day: {'draws': 301, 'hits': 5, 'untracked': 0}
- original night: {'draws': 301, 'hits': 5, 'untracked': 0}
- cards day: {'draws': 101, 'hits': 205, 'untracked': 0}
- cards night: {'draws': 101, 'hits': 205, 'untracked': 0}
- original day: {'draws': 301, 'hits': 5, 'untracked': 0}
- original night: {'draws': 301, 'hits': 4, 'untracked': 0}
- cards day: {'draws': 101, 'hits': 205, 'untracked': 0}
- cards night: {'draws': 101, 'hits': 205, 'untracked': 0}

720 queries validas, sin errores GL/cambios de simulacion. Todas las repeticiones mantienen secuencias identicas de draws/triangulos por tratamiento. Las sombras deliberadamente cambian de pose temporal; no es equivalencia exacta de pixeles.

Resultado: ahorro GPU en ambas parejas con camara fija, pero magnitud diurna variable. No extrapolar a camara movil: el contrato incluye su posicion y la seleccion de instancias; ambas pueden invalidar la sombra. No extrapolar a otros biomas ni a mapa1024. Hace falta revisar la secuencia temporal antes de promover. No se reduce densidad ni se elimina la variante artistica.
