# Distancia y cambio de nivel nativo

2026-10-06. Prueba WebGL aislada `tests/browser/far-native-transition.html`, servidor 5191, viewport 1280 × 720, DPR 1. Se añadieron controles de distancia para repetir la comprobación. La cámara conserva altura 10 y apunta a (0,3,0). Sol fijo y AfricanToon diurno; parámetros de transición 40–60 metros horizontales.

Tras completar la preparación explícita GPU, se seleccionaron 50, 100 y 25 metros, en ese orden. Los informes se guardaron cuando la actualización de frame ya reflejaba la posición elegida:

| Archivo | Nivel nativo con count=1 | Cobertura de ese nivel | ready |
| --- | --- | --- | --- |
| middle-report.json | 1 | 0,5 | 1 |
| far-report.json | 2 | 0 | 1 |
| returned-report.json | 0 | 1 | 1 |

Los niveles con count=0 conservan valores anteriores en slots sin uso; estos valores no representan objetos visibles. El cambio de nivel recompone la cobertura de la instancia activa. No vuelve a iniciar la rampa de preparación del árbol. NativeAssetGroups conserva un grupo de color en los tres estados.

Los tres informes contienen webglError=0 y errors vacío. `console.json` contiene los avisos/errores de consola capturados. Las capturas documentan árbol visible en el punto medio y lejano y retorno al 3D cercano.

## Resultado visual y límites

En middle.png se aprecia la trama del dither y una diferencia de silueta en el follaje durante la combinación de ambas representaciones. La continuidad de cobertura está acreditada en estas posiciones; la invisibilidad perceptual de la transición todavía no. Falta comprobar desplazamiento continuo, movimiento lateral, otros ángulos/alturas y fases del día, así como decidir ajustes de distancia/bruma/atlas que reduzcan esa diferencia sin penalizar frametime.

Esta prueba no mide FPS, carga en frío ni aceptación visual del juego completo. La preparación registrada de 2,10 ms procede de una escena ya renderizando y no es una medida de primera carga. El suelo es diagnóstico; no se integra todavía con WorldScene, el terreno procedural o sus sombras.
