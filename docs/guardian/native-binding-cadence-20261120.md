# Reutilización de comparaciones de admisión en el Host

El Host reutiliza la comparación con la plantilla y la búsqueda del reloj relativo cuando varias copias de un uniforme tienen la misma identidad. El resultado vive durante una sola llamada síncrona. Cada llamada conserva sus comprobaciones de vigencia, propietarios y cobertura temporal.

Three.js r180 evita trabajo repetido por grupo en `Nodes.updateGroup`. Usa el identificador de render para la frecuencia por llamada, el de frame para la frecuencia por cuadro y la versión para otros grupos. Wild Guardians limita esta reutilización a una llamada a la admisión y usa la clave de identidad que ya valida y copia el Host. [Código de Three.js](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/nodes/Nodes.js#L88-L151).

La prueba dirigida reproduce 24 copias de uniformes Farm. Las comparaciones de preparación, espera y liberación pasan de 72, 72 y 24 a 3, 3 y 1. Los casos adversos verifican el rechazo de una referencia diferente y de la ausencia del reloj relativo. El contador observa el Host instalado y cada etapa ejecuta sus propias comparaciones. El resultado caracteriza el trabajo repetido en CPU.

## Contraste físico a 60 Hz

Ambas capturas completaron el recorrido y el drenaje en NVIDIA Turing y Edge 157.0.4341.60, con 592 identidades retenidas y sin pérdida de traza CDP. Se verificó la restauración a 4K/30 Hz después de cada captura. El presupuesto se mantuvo en 1000/60 ms.

| Medida | Referencia | Candidato |
| --- | ---: | ---: |
| Dibujos enviados / oportunidades registradas | 4.921 / 4.961 | 4.944 / 4.987 |
| p95 entre inicios de dibujo | 17,420 ms | 17,520 ms |
| p99 entre inicios de dibujo | 18,840 ms | 18,825 ms |
| Intervalo máximo entre inicios de dibujo | 188,545 ms | 206,190 ms |
| Intervalos de al menos dos periodos | 6 | 7 |
| Oportunidades bloqueadas por un hold | 3 | 1 |
| Duración del primer hold | 23,170 ms | 24,505 ms |

Los dos máximos ocurren en la secuencia 3, antes de la frontera nativa. El dibujo del Host en esas ventanas dura 0,275 y 0,250 ms. La traza registra cero fábricas explícitas del Host en la ventana del máximo del candidato. Ambas capturas registran 107 fábricas explícitas y un máximo de seis simultáneas.

El cambio elimina las comparaciones repetidas verificadas en CPU. La prueba física es exploratoria y C4 sigue abierto. El máximo de arranque y el primer bloqueo requieren otra corrección. Las oportunidades y los dibujos enviados corresponden a la historia del Host. El barrido físico del monitor requiere instrumentación aparte.

La selección pasó 738 pruebas en 51 archivos y la compilación de producto terminó correctamente. El manifiesto conserva las fuentes, los recuentos, las historias de oportunidades, los informes de arranque y los hashes de las trazas completas. [Evidencia de validación](performance/native-binding-cadence-20261120/manifest.json).
