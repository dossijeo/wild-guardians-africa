# Arena del Cañón disponible como opción del laboratorio

Activación: `?visualLab=global-lighting&canyonSand=1`. Solo Gran Cañón. Sin parámetro conserva el comportamiento anterior; no es una activación global ni integración en main.

Implementa la receta normal-only conservada: depósitos procedurales, normal Aerial Beach01 a30m, color medio pigmentado, rugosidad y corrección especular seca. Grava subyacente a escala.08. Mantiene POM completo de grava; no incluye buriedRelief ni máscara precalculada descartados. Un mapa adicional compartido por materiales, propiedad y liberación en BiomeGround. Clave de programa diferenciada; shader solo parcheado en terreno del bioma con opción activa. No nueva geometría, pasadas, reglas o navegación.

## Paridad real

24 capturas/12 parejas, tres poses cercanas, media/baja, día150/noche350, semilla712,1280×720. Izquierda interceptor QA anterior, derecha integración. **12/12 parejas RGB exactas**, cámaras, objetivos, hora, draw calls y triángulos iguales. Una textura de capa en ambos, cero errores registrados. [Día](media-day-2-pair.webp), [noche](media-night-2-pair.webp), [comparación](comparison.json), [registros](captures.json).

Ambas rutas reciben además warm-floor mediante helper QA para reproducir las comparaciones previas; ese helper no forma parte de la nueva opción. La paridad acredita el traslado de la receta de arena bajo ese entorno, no todas las combinaciones de iluminación o perfiles.

`npm run build` pasa (avisos de tamaño de bundle e import estático/dinámico). Comprobación directa de activación: vacío, canyonSand sin global-lighting y global-lighting sin canyonSand devuelven false; ambos parámetros devuelven true. La selección de bioma se restringe además en BiomeGround.

## Coste y límites

No se repitió benchmark de la integración en esta serie. La receta QA previamente medida mostró coste cercano diurno +0.230/+0.536ms GPU en Intel UHD frente a grava; noche mixta. El recorrido más amplio no mostró sobrecoste relevante. No prometer ahorro, coste cero o aprobación universal. Una normal1024² RGBA8+mips≈5.33MiB nominal adicional, no VRAM medida.

Streaming y liberación previos se comprobaron con interceptor, no con esta ruta integrada: verificar también la integración antes de promover. Revisión temporal continua sigue pendiente. La paridad estática no prueba ausencia de shimmer ni fugas largas. La calidad global de seis biomas continúa incompleta.

Fuente existente CC0: Aerial Beach01 de Rob Tuytel/Poly Haven, https://polyhaven.com/a/aerial_beach_01 ; hashes en ../canyon-sand-maps/resources.json. No recursos nuevos.

## Reproducción

Vite5190:

```powershell
node tools/experiments/capture-canyon-sand-integrated.mjs
python tools/experiments/package-canyon-sand-integrated.py
npm run build
```

PNG locales. Se publican pares representativos y registros de todas las poses. Recomendada como opción experimental revisable, no como valor por defecto.
