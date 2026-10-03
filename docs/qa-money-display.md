# QA-070: saldo abreviado sin pérdida de valor

En el juego real de `b04af38`, se cargan por el menú original dos ranuras aisladas de QA. Parten de la apertura natural del ensayo de contratación y reciben financiación explícita mediante el libro contable para llegar a 150.000 y 1.234.567. No representan ingresos naturales ni acreditan rentabilidad. El launcher solo escribe las ranuras `qa-money-150000` y `qa-money-1234567` en `127.0.0.1:5176`.

La UI española muestra `150K` y `1,23M`. Se guarda por **Guardar y volver al menú** y el launcher lee los snapshots con `SaveRepository`: siguen siendo exactamente `150000/1` y `1234567/1`, según [lectura después de guardar](qa/money-display/saved-balances.txt).

Las capturas y medidas DOM confirman que el texto permanece dentro de su panel y no desborda (`scrollWidth == clientWidth`):

| Viewport CSS | Texto | Ancho del texto / panel |
|---|---|---|
| 1280×720 | 150K | 84,78 / 173 px |
| 1280×720 | 1,23M | 84,78 / 173 px |
| 390×844 | 1,23M | 64,99 / 132,60 px |
| 844×390 | 1,23M | 62,73 / 128 px |

Evidencia en [money-display](qa/money-display/), consola sin errores. El viewport se restaura y la pestaña de QA se cierra; la partida del usuario en 5173 no se modifica. Los viewports móviles verifican distribución HTML y render en escritorio, no rendimiento o interacción táctil de un dispositivo móvil físico. No se cambió código de producción del HUD.
