# Volcanes: opción cromática integrada en el laboratorio

Activación:visualLab=global-lighting&volcanicNight=spectrum. La opción ambient conserva el color anterior;sin opción el comportamiento no cambia. Se limita al suelo volcánico con materiales de bioma y tiene clave de programa propia. No altera edificios,objetos,simulación ni main.

Seis parejas QA/integración,día/noche,semilla712,media,1280×720,tres cámaras. Todas exactas píxel a píxel,misma cámara/hora/triángulos/draws ysin errores. [Normal nocturna](night-0-pair.webp),[normal diurna](day-0-pair.webp). Izquierda QA,derecha integrada.

Validación:12 tests existentes de AfricanToon,iluminación global,ceniza yroca volcánica pasan. npm run build pasa con avisos de tamaño de chunks e importación mixta de far-atmosphere. Las pruebas de imágenes verifican específicamente el nuevo modo;los tests existentes no sustituyen esa comparación.

Recomendación:conservar como opción experimental revisable. La integración no aprueba automáticamente rendimiento ni calidad global. Pendientes coste fiable,revisión global con esta opción y streaming/ciclo continuo integrados. Las pruebas previas de crepúsculo ybaja corresponden a QA;la equivalencia integrada aquí solo cubre media día/noche.

```text
node tools/experiments/capture-volcanic-spectrum-integrated-20261021.mjs
python tools/experiments/package-volcanic-spectrum-integrated-20261021.py
```

Vite5190;archivar salidas antes de repetir. No activación predeterminada ni fusión.
