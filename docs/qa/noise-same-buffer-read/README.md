# Lecturas repetidas de un mismo framebuffer

Sabana/Mapungubwe, seed 712, calidad media; fixture nativa detenida con la rama
analítica del shader QA. Tras doce renders de mundo y doce de cielo/escena,
se renderiza una vez y se leen sus píxeles doce veces síncronamente. No hay
requestAnimationFrame, promesas de hash, dibujos ni actualizaciones entre esas
doce lecturas. Los hashes se calculan después de capturar todos los buffers.

Las doce lecturas coinciden byte por byte: un hash único, cero diferencias RGB
y alpha. Los dibujos consecutivos de cielo/escena aún difieren en
0,6,9,0,2,25,28,5,0,0,5 píxeles. La cámara efectiva se conserva en esos dibujos;
el estado lógico sigue idéntico y el informe termina sin errores.

Esto separa la variación observada al volver a dibujar de la lectura repetida de
ese mismo buffer en esta vista. No identifica su causa: MSAA, geometría,
materiales y rasterizado todavía requieren controles. No demuestra estabilidad
de todos los buffers ni aprobación visual del ruido volumétrico o de FrontSide.
La ruta de solo dibujo sigue siendo diagnóstica, no sustituto del render real.

El JSON conserva sus 36 filas sin alterar. Su texto scope describe las dos rutas
anteriores; las doce filas same-buffer-read son la extensión documentada aquí.
Framebuffer 1600×900; captura de viewport 1280×720. Sin benchmark GPU, aceptación
móvil ni otros biomas. Fuente exacta y hashes en receipt.json. Mundo y pestaña
699 cerrados después de capturar.
