# Paseo Idle sobre el actor y los bancos residentes

Continuación del [kernel y reloj preparados 22](e-r3-native-idle-stroll-gpu-clock-20261116.md). El roster original sustituye reversiblemente el ciclo 21 por el paseo nativo sobre el mismo actor. Surface, proyección de Game22 y hardware siguen pendientes; este incremento no anuncia capacidad gráfica nueva ni cierra A6/e-R3/e-R4/f-R4/A/B/C.

## Fuentes y decisión

Antes del mecanismo se leyeron implementaciones reales del Three r180 instalado: [`AnimationMixer.clipAction`](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationMixer.js) busca la acción existente por clip, raíz y mezcla, y reutiliza bindings conocidos; [`Pipelines.getForRender`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Pipelines.js) busca etapas por shader y pipeline por su clave estructural. Se adapta ese patrón a los bancos, variantes reversibles y reemplazo de movimiento existentes. No se añade renderer, caché global, propietario de animación ni dependencia. La lectura de esos motores no demuestra reutilización del driver ni ausencia de tirones en hardware.

## Relevo y recibo

La preparación exige el ciclo 21 realmente presentado: secuencia, cuerpo, perfil, centro, sesión, pose/fases y ancla coinciden con la referencia plana 22. Game debe conservar su vigilancia terminal ejecutada, sin tarea/caja ni cambios de contexto. No se copia WALK deseado a Game para superar esa comprobación. El candidato usa el kernel finito y las variantes/bancos originales; captura, rollback y cancelación restauran material/visibilidad previos sin cambiar actor, raíz, huesos, geometría o índices.

El commit exige recursos confirmados de la familia 22, asociación exterior/interior iguales, ruta/secuencia adquirida, programa nativo y puertas atestadas. `copyNativeIdleStrollResources` conserva el contrato existente de la presentación: su frontera puede ser nula porque la asociación exterior liga la adquisición; si viene explícita, debe coincidir. Copiar el DTO no concede permiso. La fuente y el Host siguen validando la autoridad exacta.

La renovación usa la plantilla nueva efectivamente preparada y conserva un único propietario de datos de ruta. Tras finalizar, una liberación antigua del ciclo 21 no retira al paseo; la retirada del propietario anterior sigue siendo diferida por el mecanismo existente. No se leen poses nativas por draw ni se decide política o RNG en el renderer.

## Evidencia

Comandos, hashes, selección y límites en [la validación](performance/native-idle-stroll-roster-validation-20261116.json).

- **11 pruebas nuevas:** cuatro perfiles con captura/reversión/commit sobre el actor original; cancelación y eliminación; ciclo/pose/ancla/contexto ajenos; renovación; familia/frontera/asociación falsas; discrepancia entre recibo interior y exterior; shaders de color/sombra; selección ordinaria en tres fracciones de la ruta.
- **41/41 pruebas dirigidas**, 35285.6825 ms, incluyendo Home, ciclo 21 y consecuencia anteriores.
- **217/217 pruebas de regresión enfocada en 19 archivos**, 136580.7978 ms. Incluyen también primera tarea/reanudación, restantes familias gráficas originales, fuente/control/admisión/picking del paseo y guards de canales. No es una regresión nueva de todo el repositorio ni aceptación integrada del producto.
- **Build correcto en 48.81 s.** Las 45 entradas comprobadas conservan hashes durante regresión/build. Las 17 entradas nativas, 16 archivos locales ajenos protegidos y helper pthread original permanecen idénticos; no se recompila WASM.

Fuente WASM, GLB, clips, roster, builders TSL y selección son reales; renderer/admisión son dobles. Esta evidencia no mide asignaciones del dispositivo, pipelines del driver ni fotogramas GPU. La comprobación hardware de conservación de recursos y cero asignaciones tras READY permanece pendiente.

## Continuación

Integrar la familia en Surface y su adopción de publicación real, completar la proyección ejecutada de Game22 que ese relevo requiere y verificar ambos sobre hardware. No sustituir la pose de un paseo por el cuerpo inicial ni fabricar una proyección anticipada. Después siguen llegada/fuente estacionaria/REST, aproximación/anclas/bloqueo, productor ordinario, otras clases/finales/puertas, nacimiento/sustitución en vivo, recuperación incremental integral de 3123 recursos sanos y los cierres A6/A/B/C. No se inicia D.
