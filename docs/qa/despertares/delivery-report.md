# Entrega de Despertares mágicos

Actualización: las [campañas ampliadas](expanded-campaign-review.md) terminaron antes de la [revisión de usabilidad del HUD](hud-usability-review.md), cuya evidencia incluye una [comparación antes/después](hud-usability-comparison/index.html). La revisión no modifica el balance.

Rama `feature/despertares-magia`, creada desde `origin/main` (`020dc1ea58857f3c0cdf154b62fc65bdd429cdea`). Implementación en checkout aislado; se conservan los cambios ajenos del checkout original. [PR #223](https://github.com/dossijeo/wild-guardians-africa/pull/223), en borrador y sin fusionar.

## Implementación jugable

El amanecer evalúa resultados reales de agricultura, economía, defensa y acontecimientos, con historial determinista y persistente. Una carga de 100 se conserva hasta aplicar correctamente la bendición. La selección permite inspeccionar, confirmar, cancelar y mover la cámara; objetivos inválidos y comandos repetidos no consumen otra carga. Magia y Despertar mantienen controles independientes, con HUD horizontal y vertical y avisos ES/EN.

Las plantas conservan especie, malla y estado de crecimiento. Se convierten en fuentes permanentes no cosechables y dejan de recibir tareas o hechizos agrícolas. Los vecinos reciben modificadores pasivos separados de los presupuestos de Grow/Multiply. El extra de cosecha viaja en la caja y se cobra una sola vez al entregarla. La destrucción retira inmediatamente la influencia; las cajas ya cosechadas conservan su valor.

Las murallas conservan colisiones, puertas, navegación, daño y reparación nativos. Protegen su propio módulo y los módulos físicamente contiguos; no propagan protección indefinidamente por una cadena. La reparación no borra una bendición intacta ni restaura una ya perdida tras ruina. Los cultivos bendecidos siguen sujetos al daño agrícola normal, incluido el daño de área.

## Arquitectura y parámetros

Se amplían los comandos, eventos y contabilidad de `simulation/game.js`; el daño agrícola compartido, el daño estructural, las cajas físicas, la topología de murallas y la validación/serialización existentes. La influencia agrícola usa caché invalidada por cambios, no una búsqueda global por fotograma. Guardados antiguos migran sin premios retroactivos; recargar no repite la evaluación del amanecer ni vuelve a generar una bendición.

| Parámetro de primera versión | Valor |
| --- | --- |
| Carga almacenada | 100 puntos, una carga |
| Rendimiento decreciente | Puntos positivos / (1 + 0,08 × bendiciones activas) |
| Categorías máximas | Agricultura 8, economía 8, defensa 12, acontecimientos 4 |
| Penalización | Máximo 6, sin multiplicarla por fuentes activas |
| Radio agrícola | 2,05 m |
| Crecimiento y cosecha pasivos | +20 % cada uno |
| Solapamiento | 20 %, 10 %, 5 %; máximo 35 % |
| Tolerancia de riego | +20 % |
| Resistencia de planta bendecida | 2 impactos agrícolas |
| Reducción de daño de muralla propia / contigua | 25 % / 10 % |

Se mantienen los valores iniciales propuestos porque las campañas muestran beneficios sin invulnerabilidad ni crecimiento económico exponencial observado. Esto no demuestra balance óptimo. Las derrotas y la supervivencia final frágil aconsejan evaluar más políticas antes de subir porcentajes generales para compensar decisiones del jugador virtual. La proyección matemática sin pérdidas comprueba la cadencia de aproximadamente 13 cargas a 20 puntos diarios; las campañas reales tienen pérdidas, reinversión y otra cadencia.

## Arte y rendimiento

[Comparación de los cinco mockups con capturas reales](comparison-final/index.html), [70 variantes de cultivos y murallas](variants-final/index.html), [análisis visual y perfil GPU](visual-mockup-review.md), [clip de transformación y desaparición](look-final/awakening-motion.webm).

Se revisaron los ocho cultivos y los cinco materiales de muralla: día/noche, plantas jóvenes/maduras, muro dañado y puertas abiertas/cerradas. Las raíces se integran en el material del terreno; una única nube de partículas y tres pasadas de resplandor añaden cuatro draws tanto con una como con 32 fuentes. El radio decorativo de las raíces, hasta 4,25 m, no aumenta el radio agrícola.

En Intel UHD / Chrome ANGLE D3D11, 1280×800 y calidad media, el coste GPU mediano adicional observado fue aproximadamente 3–5 ms. No hay regeneración de máscaras en reposo. Reconstruir una zona de 32 fuentes cuesta 21–50 ms en esta ejecución; queda un pico puntual que conviene reducir antes de exigir fluidez estable en dispositivos más modestos. No se certifican 60 fps ni rendimiento móvil.

Las referencias presentan mallas de maíz más lisas y una muralla con ornamentos inexistentes en el modelo original. Se conservan los originales como exige el alcance: los efectos se han aproximado mediante comparación, pero no se declara una reproducción idéntica. Las capturas no se retocan ni se sustituyen por imágenes conceptuales.

## Validación

- Suite completa: **5097 pruebas; 5035 aprobadas, cero fallos, 62 omitidas**, 990,90 s. [Salida completa](post-visual-full-tests.txt). Las omisiones incluyen suites que requieren seleccionar WASM experimentales distintos del runtime utilizado.
- Suite dirigida de Despertares y regresiones: **107/107**, [salida](look-final-regressions.txt).
- Build aprobado, [salida](look-final-build.txt); sintaxis de navegador sin fallos, [salida](look-final-browser-syntax.txt).
- Cero errores de aplicación/shader en las capturas finales; el harness verifica también que la textura de resplandor contiene luz real en GPU.
- HUD probado en ambas orientaciones, incluidas 360×640, 390×844, 844×390, 1280×720 y captura comparativa 1280×592, con confirmación, cancelación y teclado.

[Informe económico y de supervivencia](balance-review.md). Los informes completos y sus estados terminales se conservan como gzip sin pérdida, con resumen JSON reproducible. La financiación y los relojes prescritos del fixture visual no se usan como evidencia económica.

## Commits principales

`f6e2691bc`: progreso/persistencia; `34aee3fcb`: cultivos; `61f9131ca`: murallas; `d13579b87`: raíces; `6036cfcff`: VFX; `63ea11d1a`: HUD/selección; `e140fdcd6`: campañas y perfilado; `4e5fb6201` y `cd46e769f`: validación gráfica; `21b27f719`: ajuste a mockups y todas las variantes; `a2983ea1e`: evidencia económica y comparación reproducible. Los commits posteriores completan los informes de validación.

## Recomendaciones antes de fusionar

Revisar visualmente las comparativas, especialmente el entramado denso de raíces y el motivo fragmentado sobre zarzas y tablones. Probar en dispositivos móviles reales y perfilar los picos de reconstrucción de máscaras. Ampliar semillas y decisiones del jugador virtual para distinguir problemas de estrategia de problemas de balance; no inferir diversión de mayores ingresos ni salud de la granja del indicador de victoria. La PR permanece en borrador para esa revisión.
