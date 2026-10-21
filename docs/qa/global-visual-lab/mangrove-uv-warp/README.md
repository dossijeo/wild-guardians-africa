# Manglares: perturbación UV descartada como solución de repetición

**No promover.** La candidata curva la disposición de formas, pero conserva el aspecto de musgo abultado uniforme. No resuelve la organización de cobertura ni la escala de detalle observadas en el mockup. No justifica continuar afinando solo deformaciones de UV.

[Vista normal día](manglares-media-day-pair.webp) · [Noche](manglares-media-night-pair.webp).

## Pipeline real y prueba

Moss002, escala.115, normalBoost1.3. Aunque la configuración contiene relief.18, la rama uGroundPureMoss retorna antes del POM general: lee color, normal y ARH; fija materialCover410=1 y wet=0. Por tanto, el terreno de musgo puro no usa la máscara de cobertura de la rama general ni su parallax. Los parches de barro son otra superficie con mezcla QA. Esta distinción cambia la siguiente investigación: no aumentar POM o cambiar máscaras que esta ruta no consume.

Intercepción solo QA: antes de derivadas UV, añade dos campos materialNoise anclados a worldPatternPosition, frecuencia.14, desplazamiento UV entre-.24 y+.24. Las tres texturas usan esas coordenadas. No añade lecturas de textura, geometría ni draw calls, pero sí cálculo procedural. No se transforma la base tangente según el Jacobiano de la deformación: limitación de coherencia de normales, otra razón para no integrar esta aproximación sin más trabajo. No hay POM en la rama probada.

24 capturas/12 parejas, Manglares seed712, media/baja1280×720, día150/noche350, tres cámaras. Ambos conservan barro/musgo toon-interior QA. Simulación y materiales congelados. Inspección principal: candidata normal diurna completa, contrastada con mosaico global anterior y mockup de Manglares. Siguen dominando formas similares en toda la superficie; el cambio de alineación no es la mejora solicitada. No se afirma inspección visual exhaustiva nocturna.

No benchmark de esta candidata: descartada en la puerta artística. No afirmar ahorro por carecer de texturas nuevas. Ningún cambio al renderer principal, ocupación, navegación, modelos o main.

## Fallo del piloto y corrección

La primera inserción usó if(moss) antes de declarar esa variable: compilación fallida ('moss: undeclared identifier'). El juego mostró error de preparación y el capturador esperó180s. Dos repeticiones y una captura de estado localizaron el fallo; no eran mediciones de carga válidas. Se corrigió para actuar dentro de la rama anticipada pura y el capturador ahora detecta shaderFailure antes de esperar la escena. La serie final sí completa el juego. No atribuir los timeouts a coste GPU o inestabilidad del material.

Siguiente dirección: combinar regiones de musgo y detalle fino/terreno húmedo en esta ruta real, sin modificar distribución autoritativa de barro o vegetación. No basta con desplazar la misma textura.

## Reproducción

```powershell
node tools/experiments/capture-mangrove-uv-warp.mjs
python tools/experiments/package-mangrove-uv-warp.py
```

Vite5190. [Registros](captures.json), [comparación](comparison.json). Recursos existentes, sin nuevas fuentes externas. PNG/WebP completos locales; pares normales y registros publicados.
