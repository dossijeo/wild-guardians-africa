# Walk como dependencia de Idle20 en frío

Cuando la publicación de terreno se confirma pronto, el roster puede recibir Idle20 mientras el Walk del actor se descarga y el instalador Idle ordinario conserva el turno. Una captura de `youngMale` encontró `bakeResource` disponible, `idlePending` activo y `bakeRequestPromise` ausente. El paquete requería la instalación antes de preparar la variante nativa y el intento falló con `Native initial Idle body resource unavailable`. [Recibo de la dependencia](performance/native-task-stop-home-graphics-20261120/idle20-terrain-priority.json) · [Prioridad del terreno](native-terrain-priority-handoff-20261121.md).

El roster solicita Walk y espera el recurso. Después espera las instalaciones Idle o Alert que ya poseen el turno y vuelve a solicitar Walk por el instalador existente. Exige que Walk esté instalado antes de adquirir el bloqueo de la preparación nativa. Alert expone su promesa de instalación igual que Idle. Se comprueban la vigencia del actor, su pose y la cancelación después de cada espera. El mismo actor y sus recursos permanecen residentes durante el relevo.

Three registra la dependencia glTF antes de leerla y marca el recurso preparado al terminar el parser. Godot espera el token de carga iniciado para resolver el recurso que se solicitó. Wild Guardians adapta la comprobación de vigencia y espera la instalación en el propietario que ya controla el actor. [Three GLTFLoader](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/GLTFLoader.js#L265-L303) · [Godot ResourceLoader](https://github.com/godotengine/godot/blob/4.4-stable/core/io/resource_loader.cpp#L660-L691).

## Pruebas dirigidas

```powershell
.cache/tooling/node20.exe --test tests/native-idle-walk.test.js tests/native-initial-idle-body-graphics.test.js tests/webgpu-worker-roster.test.js
```

Las 11 nuevas pruebas cubren los cuatro perfiles en reposo y alerta, una instalación y una descarga de Walk, y la adquisición de Idle20 sobre el actor original. Cancelar, retirar el actor o cambiar su pose invalida una preparación pendiente. El contraste del código anterior falla en el caso frío de `youngMale` después de descargar Walk.

Pasaron 171 pruebas de preparación de terreno, admisión, Idle y Home y la compilación Vite de producción. La comprobación aislada del horizonte histórico de Harvest ya devolvía `false` en `e1eb667d8`, antes de los dos cambios de arranque. [Prueba histórica de Harvest](../../tests/webgpu-worker-roster.test.js#L185).

## GPU física

Los cuatro perfiles adquirieron y dibujaron Idle20 en Edge con NVIDIA Turing sin esperar de antemano la confirmación visual. El preparador respondió entre 7,24 y 9,43 s desde la solicitud, dentro del plazo existente. La publicación visual se confirmó entre 2,80 y 5,43 s. Cada ejecución presentó el cuerpo 1 y confirmó el drenaje con cero errores WebGPU. C4 sigue abierto. [Recibos de arranque](performance/native-task-stop-home-graphics-20261120/idle20-terrain-priority.json).

Dos ejecuciones adicionales con `youngMale` empezaron en frío. Plant partió de una orden ordinaria y Water de un cultivo guardado cuyo riego vencía durante el avance. Ambos pasaron por Idle20 → Task14 → Action15 → Idle20 con los tickets 2, 6, 8 y 10. Cada ejecución publicó un solo `WaterSatisfied`, conservó el cuerpo, la raíz y los 36 propietarios de geometría, y confirmó el drenaje con cero errores WebGPU. La orden Plant durante Idle22 en marcha sigue pendiente. [Recibos de las dos acciones](performance/native-task-stop-home-graphics-20261120/idle20-terrain-priority.json#L329).
