# Pantalla encendida: corrección para cierre de release

El jugador confirmó que la pantalla de su móvil físico sigue apagándose. Por tanto la aceptación física anterior queda pendiente, aunque el controlador mostrara reproducción o un sentinel concedido en escritorio.

El respaldo anterior era un MP4 sin audio y un elemento de vídeo separado del DOM. Se sustituye por un MP4 propio de 16 × 16, 1 fps y dos segundos, con AAC de silencio (2838 bytes). Se mantiene montado dentro del viewport, inline, sin controles ni captura de input. Solo se reproduce cuando el bloqueo nativo no está disponible o falla. Un rechazo nativo puede reintentarse con un gesto posterior o al recuperar visibilidad; si se concede, se pausa el respaldo. Se limpia el elemento al destruir el controlador. No hay trabajo por fotograma del juego.

Validación: doce pruebas de controlador, incluyendo rechazo temporal, gesto dentro del iframe del menú, visibilidad, concesiones tardías, limpieza y ausencia de vídeo con bloqueo nativo. Navegador real de escritorio, fixture de producción con API deliberadamente desactivada: vídeo montado, `readyState: 4`, tiempo avanzando, pausa al desactivar; `fallback-dom.txt` y `fallback.png`. Esto acredita el funcionamiento del respaldo, **no** la inhibición física del apagado del teléfono. Esa prueba debe repetirse en el dispositivo afectado.

Dispositivo informado: Pixel 10a / Chrome / https://dossijeo.itch.io/wild-guardians-africa. Inspección DOM de esa página el 5 de octubre: el iframe apunta a `https://html.itch.zone/html/19573835/index.html?v=1791183314`, permite `autoplay` y `fullscreen *`, pero no declara `screen-wake-lock`. La política por defecto `self` no delega esa API al origen distinto del juego. La fixture `screen-wake-lock-embedded.html` permite comprobar el controlador con esa capacidad denegada.

Referencia de política de vídeo: [WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/). La API nativa tiene restricciones de contexto seguro y permisos de iframe: [W3C Screen Wake Lock](https://www.w3.org/TR/screen-wake-lock/). La aplicación no puede concederse una política que bloquee la página anfitriona.

Reproducción del MP4 generado:

```powershell
ffmpeg -hide_banner -loglevel error -y -f lavfi -i color=c=black:s=16x16:r=1 -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -c:v libx264 -profile:v baseline -pix_fmt yuv420p -c:a aac -b:a 8k -movflags +faststart public/assets/screen-awake.mp4
```
