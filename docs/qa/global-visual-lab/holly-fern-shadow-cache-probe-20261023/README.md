# VFX: contrato de profundidad para la cache solar

Diagnostico en la escena poblada de Manglares: `Untracked shadow callback`, funcion `(r,o,c,shadowCamera)=>this.cameraUniforms(shadowCamera)`, procedente de las particulas solidas de NativeVfx. Antes: 529 dibujos, 0 aciertos, 402 rechazos en una carga diagnostica. Los contadores de carga no son un benchmark temporal y varian entre ejecuciones.

Cambio: declarar el callback conocido y las entradas de profundidad reales de vfxShadowVertex: matriz del efecto, uInst, uModel, uTime y uWind. Las matrices de luz y atributos activos de instancias ya los observa shadowSnapshot. No se observa el valor transitorio uVP escrito por la camara de vista: se deriva de la camara solar y la transformacion del efecto durante onBeforeShadow. No se elimina el mecanismo conservador para callbacks desconocidos.

Validacion:
- 23 tests focalizados pasan: shadow-cache y vfx-rendering.
- Nuevo test verifica reutilizacion al cambiar solo la camara de vista; invalidacion por tiempo, viento, transformacion del efecto e instancias; callback desconocido sigue rechazandose.
- Dos cargas reales corregidas: 141 dibujos/407 aciertos y 143 dibujos/410 aciertos; cero untracked.
- Captura con cache desactivada frente a activada, mismo estado/tiempo/camara: 0 pixeles diferentes, maximo delta 0; sin errores GL.

No se atribuye una mejora de FPS a estos contadores. Los benchmarks anteriores de sombras de helechos se ejecutaron sin este contrato y no representan la nueva base. Repetir el A/B/A/B antes de decidir el coste de sombras animadas. Esta prueba es diurna, con campaña pausada; no demuestra ausencia de regresiones en todas las campañas o efectos activos.

Reproduccion: Vite 5190; node tools/experiments/probe-holly-fern-shadow-cache-20261023.mjs. El script identifica excepciones mediante una ruta QA sin alterar el comportamiento de rechazo de la cache.
