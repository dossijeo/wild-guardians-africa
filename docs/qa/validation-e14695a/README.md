# CI de main e14695a

Validación del commit `e14695a00bac52d93272b111e6a56543a00a20b1`, anterior a la instrumentación de mundo nativo de `../shadow-world-current`.

- [Validate Game, 37568078170](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37568078170): terminado correctamente, 2702 tests aprobados, cero fallos, cancelaciones o saltos. El log completo comprimido conserva las verificaciones de assets, audio, web, plan, balance, build y empaquetado.
- [Windows, 37568078173](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37568078173): terminado correctamente; inventario del instalador y ejecutable en `result.json`, informes nativos originales comprimidos y log completo.

La comprobación nativa de visibilidad mide 300037 ms de minimización real: las proyecciones de estado al inicio y final coinciden exactamente. Restaurar conserva la pausa de menú; al cerrarlo la simulación avanza 0,8226 segundos sin recuperar el tiempo oculto. El contrato del smoke exige avance positivo limitado por el tiempo visible, no un mínimo de un segundo. La comparación excluye savedAt, avisos, presentación del tutorial y su contador nextId, según el alcance declarado en el informe.

`result.json` conserva SHA-256 de los logs y de los JSON originales antes de comprimirlos. Los endpoints de artefactos de esta ejecución devolvieron JSON directamente; se archivaron sus bytes originales sin reinterpretarlos como ZIP.

Esta evidencia acredita estas ejecuciones y el comportamiento nativo medido en Windows. No acredita pantalla encendida en Android físico, igualdad perceptual de todos los biomas ni campañas completas de cien noches. Los commits posteriores necesitan su propia validación.
