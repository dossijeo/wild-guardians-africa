# Arena completa disponible en el laboratorio

Activación: `?visualLab=global-lighting&canyonSand=full`. `canyonSand=1` conserva la receta económica. Sin opción explícita, comportamiento anterior; solo Gran Cañón carga los recursos. No integración en main.

La ruta completa conserva normales y añade el color Aerial Beach01 existente, copiado sin modificación a public/assets/visual-lab. [Fuente, licencia CC0 y hash](asset-provenance.json). La textura se clona y administra mediante layerTextures de BiomeGround. Programa distinto por variante para evitar reutilización incorrecta de caché, incluyendo horizonte. No geometría, draws ni pasadas adicionales.

24 capturas/12 parejas QA frente a integración, media/baja1280×720, día150/noche350, semilla712, tres poses cercanas. Cámara, objetivo, hora, llamadas y triángulos iguales; dos texturas de capa en cada captura. Sin errores.11parejas RGB exactas; una baja diurna intermedia cambia2píxeles, error medio.000000723/255, causa no aislada. [Auditoría](comparison.json), [capturas](captures.json), [día](media-day-2-pair.webp), [noche](media-night-2-pair.webp). No declarar igualdad exacta total.

Primera ejecución excluida: aserción del capturador heredada esperaba una textura. Corregida a dos y repetida la matriz completa. Build correcto409módulos, advertencias de tamaño de bundle/importación mixta. Siete pruebas existentes de iluminación/roca/arena pasan, más dos pruebas nuevas de activación y separación de programas residente/horizonte.

El [benchmark QA directo](../canyon-sand-full-review/performance/README.md) muestra coste nocturno+.156/+.311ms frente a normal-only y día inconcluso. Esta ronda no es otro benchmark ni prueba de coste cercano. Pendientes streaming integrado de ambas texturas, cierre y horizonte en ejecución real. La prueba unitaria de construcción de shader de horizonte no sustituye esa validación.

La comparación incluye el helper QA de suelo cálido en ambos lados; esta opción integra la arena, no ese helper adicional. No atribuirle por sí sola toda la imagen de las capturas. Conservar la receta completa como opción artística revisable, no reemplazar automáticamente perfiles ni afirmar calidad global alcanzada.

```powershell
node tools/experiments/capture-canyon-sand-full-integrated.mjs
python tools/experiments/package-canyon-sand-full-integrated.py
node --test tests/global-canyon-sand.test.js
npm run build
```

Vite5190. Simulación, navegación, balance y modelos intactos. PNG locales, pares seleccionados y registros publicados.
