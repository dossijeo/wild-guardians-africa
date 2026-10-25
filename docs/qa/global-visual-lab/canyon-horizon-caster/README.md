# Horizonte de Gran Cañón como emisor de sombra

QA media,seed712,1280x720,poses24/36/47 día150/noche350. Cambio único: ground.castShadow=true en horizon.js mediante ruta Playwright. Misma malla y materiales; no nuevas siluetas ni consultas de simulación. Seis parejas con cámara,hora y contadores del pase de color iguales; cero errores WebGL.

Inspección día36/47: se recupera la franja sombreada del fondo del valle más allá del corte que aparecía en control. En47 el contraste es especialmente claro: control deja una gran zona lejana iluminada pese a la pared continua; candidata prolonga la sombra manteniendo calidez y volumen. Esto respalda la falta de geometría lejana entre los emisores de shadow map como causa, en lugar de un simple fallo de recepción o textura. No certifica todos los puntos de vista ni la unión exacta de LOD.

El ensayo anterior `canyon-shadow-edge-fade` amplió smoothstep(.005,.045) a(.005,.16). Día36 conserva el corte principal, aunque altera sombras en los bordes. No se adopta: atenuar más no sustituye las paredes ausentes del shadow map.

Mantener candidata de emisor lejano. El contador renderer.info de estas capturas corresponde al render final, no al trabajo completo de sombras: igualdad de calls/triangles NO significa coste nulo. Falta medir actualización fría/caliente de shadow cache, triángulos extra en shadow pass, movimiento y perfiles modestos; no afirmación de FPS. No se integra todavía en producción ni main.

Reproducir Vite5190: capture/package-canyon-horizon-caster y capture/package-canyon-shadow-edge-fade (.mjs/.py) en tools/experiments. Láminas control izquierda, candidata derecha; capturas y resumen adjuntos. PNG fuente regenerables locales.
