# Proyección relativa en todas las pasadas

Continúa los [buffers relativos](qa-render-origin.md), publicados en `2eb4910`.
`e4f584d` añade una ventana síncrona de render: escena, cámara, luz y raíces
detached ven el mismo origen relativo durante proyección, profundidad, sombras,
DEST y preparación/dibujo de VFX. `finally` restaura posiciones, bounds y matrices
globales, incluso ante un error. Simulación, navegación, picking, consultas de
superficie y avance de efectos se ejecutan fuera de esa ventana.

Los vectores de vista, derivadas geométricas y PCF usan posiciones relativas.
Pigmento, ruido de superficie, estratos y fase del agua reconstruyen su posición
global mediante `uWorldOrigin`, para anclarse al mismo terreno. Los atributos de
recorte del chunk son locales: mantienen la regla de bordes semiabiertos sin
restar dos números globales Float32. Bounds de agua/horizonte y contactos se
trasladan solo durante el dibujo. Los proxies de sombras no aplican dos veces
el desplazamiento de la escena.

Cinco pruebas nuevas cubren restauración ante excepción, precisión a ±48 millones,
proyección equivalente en CPU, staging de proxies, deduplicación de bounds,
recortes a ±4.800 millones y contratos global/local de los shaders. La primera
regresión local pasó 619/620: una aserción volcánica conservaba la antigua llamada
de pigmento. Corregida para el nuevo contrato, la **CI 37075133825 de e4f584d pasa
620/620**, cero fallos, verificación de assets, build y paquete web. Las CI anteriores
de `2eb4910` y `f7e780f` también finalizaron correctamente.

Navegador Intel UHD/ANGLE, semilla 712, media, seis biomas con Mapungubwe:
`docs/qa/render-origin-window/checks.json` y capturas numeradas 1/6/11/16/21/26.
Las seis cargas terminaron sin cola y con cero errores/avisos de consola.
Sabana dibuja con origen (192,48). Se comprobaron también agua, cultivos,
trabajadores, bestias y daño DEST; Manglares tras viajar hasta origen (192,0),
incluyendo noche, conservó PCF y reutilización de sombra. Las capturas adicionales
con su interfaz de diagnóstico se conservan en el mismo directorio.

El ensayo de cultivos del [QA de acciones](qa-performance-actions.md) usa el
origen (192,48), conserva estado lógico y sombras durante 210 frames reales.
No demuestra identidad binaria de imagen, ganancia de FPS, precisión del ruido
global a distancias arbitrarias ni cobertura de todas las culturas/campaña/móvil.
Los patrones globales siguen reconstruyéndose en precisión de shader.
La comparación de píxeles de la etapa anterior sigue documentada, sin atribuir
sus diferencias al driver ni declararlas resueltas por esta comprobación.

La inspección de Escudo formado encontró una consulta de altura que aún usaba la matriz temporal relativa al generar su cúpula. `14f2e6d` conserva una matriz global CPU de superficie, capturada durante seek/avance, separada de la matriz de proyección. La nueva prueba falla antes de la corrección y pasa después; cúpula y bendiciones Growth/Multiply conservan sus vértices locales y consultan alturas globales bajo traslación, rotación y escala. Pasan 15/15 dirigidas. Se conserva la captura anterior y se repite el ensayo legal de noche 2; no debe confundirse ausencia de error WebGL con geometría correcta.

Resultado visual tras `14f2e6d`: la cúpula completa vuelve a emerger sobre el terreno, en origen (240,48), noche 2, semilla 712/cultura Suajili. La captura anterior solo mostraba el anillo porque sus vértices superiores consultaban alturas en el lugar equivocado. Los estados de las capturas anterior/posterior difieren (la anterior era posterior a un ataque); no constituyen una comparación binaria. La consola del tab conserva un rechazo anterior de magia aún no desbloqueada del día 1, sin errores WebGL/shader nuevos. La repetición final lanza Escudo legalmente en noche 2.

Validación final de `14f2e6d`: **630/630** locales, cero fallos/omisiones, 371,37 s; **CI 37077302380** aprobada con 630/630, assets, build y paquete. Paquete final: 554 archivos, 379.665.147 bytes, 794 enlaces relativos y 20 GLB. Se comprobó expiración de Escudo (recarga restante 70 s) y un ataque natural posterior del facóquero: un golpe lógico, una planta destruida y VFX original con 16 sprites/un contacto decorativo, con origen (240,48). Esta prueba aislada no acredita toda la campaña.
