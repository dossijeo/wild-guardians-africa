# Desierto: horizonte con cámara baja

Validación sobre 26d314d79, sin cambios al renderizador. Conserva arena y sombras aprobadas. La lava original también queda aprobada por petición expresa del usuario; sus variantes QA no se incorporan.

## Reproducción

Con el servidor del laboratorio en 5190:

```powershell
node tools/experiments/capture-desert-horizon-active-excursion-20261023.mjs
python tools/experiments/audit-desert-active-excursion-20261023.py docs/qa/global-visual-lab/desierto-horizon-active-excursion-20261023
```

Intel UHD / ANGLE, 1280×720. Fixture poblada existente; cámara manual con offset (30,5,25), altura mínima 1.5 m sobre terreno. Recorrido de ida/vuelta de 144 m en X y 50.4 m en Z, 40 segundos por fase. Simulación, materiales, viento, impostores, montañas y streaming activos.

## Resultado

Auditoría automatizada correcta: sin errores de página/WebGL, pausas ni overflow de cobertura; recorrido XZ esperado y trabajadores activos. Día: 41 conjuntos de chunks distintos, 287 observaciones con solicitudes pendientes, 117–168 geometrías y 72–86 texturas. Noche: 43 conjuntos, 265 observaciones pendientes, 123–175 geometrías y 71–80 texturas. Hubo cambio de origen durante el conjunto de la prueba; no se exige uno nuevo en cada fase.

Revisadas visualmente las dos hojas de contacto (nueve momentos por fase) y el fotograma central diurno a resolución completa. En estos puntos no se aprecian huecos del horizonte. Las dunas ocultan parte de las montañas al avanzar, que reaparecen al regresar. Se mantiene el detalle aprobado de arena y sombras. La ocultación suave del árbol cercano es visible durante el recorrido; no se altera aquí.

[Contacto diurno](day-contact.jpg) · [Contacto nocturno](night-contact.jpg)

## Límites

Los vídeos locales day.webm y night.webm duran 39.92 y 39.91 segundos. Se han verificado formato y duración; esta revisión de contactos no equivale a revisar cada fotograma de vídeo ni certifica ausencia de popping entre capturas. No es un benchmark: grabación activa, sin temporizadores GPU; los recuentos de fotogramas no se presentan como FPS. El tiempo simulado avanza 39.28 s de día y 109.07 s de noche, por lo que las fases no constituyen cargas equivalentes para una comparación de rendimiento. Los rangos de recursos durante una excursión tampoco demuestran ausencia de fugas a largo plazo.
