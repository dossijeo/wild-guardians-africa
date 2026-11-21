# Farm23 terminada en el ciclo de Game — 2026-11-19

Continuación A5/e-R3/f-R4 del [plan integrado](integrated-gpu-migration-plan-20261104.md), tras la [reutilización caliente en main](main-retained-resource-reuse-20261119.md). La auditoría contrasta los componentes Farm23→Task/Home/Idle ya terminados con su exclusión todavía presente en Game. Se conectan esos componentes; no se recrean sus protocolos ni se habilita la ruta móvil o el productor ordinario Farm.

## Comportamiento

La clasificación nativa admite el extremo Farm23 únicamente cuando nativeCompletedFarmArrivalBodyCurrent acredita su fuente/cuerpo actuales, llegada, velocidad cero, fin de carrera y tiempo terminal real. Game usa la proyección existente del mismo caché nativo; conserva arriving y no inventa Idle ni una suspensión24. El mismo cuerpo, fases y RNG permanecen mientras avanza el reloj común y el Task peer.

El planificador ordinario puede reclamar trabajo real desde ese extremo y retener el cuerpo en Task6 hasta adquirir14. Un contrato vencido por día u hora declara primero el Home19 existente, aunque haya trabajo en cola; Home18 conserva el cuerpo. Sin sucesor adquirido, Game espera; adquirir Idle21 mediante el protocolo existente conserva su nacimiento y RNG privado. La ruta Farm aún móvil continúa rechazada antes del tiempo o cualquier cuerpo; una fuente retirada o centro cambiado tampoco autoriza avance.

No cambian exports, ABI, controlador, cola, reloj, dueño, dependencia ni consumidor gráfico. Se reconstruyen los dos WASM con la receta canónica y outputs aislados; el módulo JS pthread y el worker conservan bytes. Los tres cambios del mapa nativo son los dos binarios y spatial-task-execution.inc.

## Investigación aplicada

Se lee el código real de [Godot NavigationAgent3D 4.4](https://github.com/godotengine/godot/blob/4.4-stable/scene/3d/navigation_agent_3d.cpp): _update_navigation y _transition_to_navigation_finished distinguen terminar navegación, detener velocidad y alcanzar destino sin destruir al agente. Se adapta esa separación al criterio terminal y cuerpo ya existentes de Wild Guardians; no se introduce otro agente ni una máquina de estados. La elección Task/Home continúa en el transactor original.

La auditoría A5 lee [Three Geometries r180](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Geometries.js), [Attributes](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Attributes.js), [RenderObject](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/RenderObject.js) y [Babylon Geometry](https://github.com/BabylonJS/Babylon.js/blob/048566f71dfce0f62d993fd3a7bcadc844407315/packages/dev/core/src/Meshes/geometry.ts). Babylon mantiene asociaciones de meshes y referencias de buffers; Three destruye los atributos del RenderObject cacheado al disponer su geometría. Sus modelos de vida útil son distintos.

Cuatro controles usan esos métodos reales de Three con backend de registro, sin afirmar GPU hardware. Clone profundo y cloneChunkGeometry conservan buffers de la fuente y crean cero al siguiente dibujo. Compartir BufferAttribute e índice entre geometrías destruye los de la fuente y causa dos recreaciones; retirar atributos antes de dispose todavía causa una, por el caché de RenderObject. Se conserva la solución existente: arrays CPU compartidos donde ya corresponde y atributos con vida GPU independiente. No se añade refcount/caché propio ni se acepta la huella fría como mínima. Este resultado evita introducir una causa de reconstrucción, pero no cierra el coste inicial A5.

## Validación y límites

Baseline con los binarios anteriores: 3 pases y 48 fallos entre 51 casos. Candidato: 51/51, cuatro perfiles, standalone/pthread, llegada con viaje o distancia cero, espera, trabajo auténtico, prioridad Home por día/hora e Idle adquirido; tres rechazos conservados. No se fabrica recibo gráfico.

La primera selección dirigida termina 1887 pases/8 fallos entre 1895 casos de116 archivos. Los ocho fallos eran aserciones antiguas que exigían rechazo después de completar23. Se actualiza solo ese contrato de la prueba gráfica: rechazo inicial mientras mueve, llegada y velocidad cero explícitas, admisión final; se mantienen muestras de trayectoria/fases. Sus14 casos pasan después. La selección completa final termina 4503/4504, cero fallos y una omisión opcional por falta de segundo WASM comparativo, en347 archivos. Las dos pruebas early-native-startup que solo figuran en la selección dirigida ya pasaron y sus fuentes permanecen exactas. Las tres exclusiones históricas de host/timeline siguen abiertas y no se vuelven a presentar como validadas.

Build de producto con VITE_PRESENTATION_BACKEND=webgpu-worker y VITE_WEBGPU_REMOTE_DRAW=true correcto, 62.013 s totales. Tres sintaxis pasan. Se fijan 627 inputs, 64 nativos y 16 archivos ajenos; se conservan íntegros los documentos principales anteriores. Los logs, comandos, fuentes del ensayo y controles quedan en el recibo.

La regresión GPU real nvidia/turing del consumidor Farm23→Task6/14 conserva 651 IDs de geometrías/bancos, sustituye 1 dato de movimiento, prepara 70 recursos y crea 0 después de READY. Completa picking, adopción y drenaje, con 54/54 dibujos durante los bloqueos de preparación/relevo de 1800 ms; sin errores navegador/HTTP/GPU. Es una captura timing sin PNG, con fuente de componente y puertos reales: regresión del consumidor existente, no prueba de entrada Farm ordinaria, de la nueva decisión Game en ese navegador ni aceptación de cadencia.

## Siguiente punto

Integrar la ruta Farm móvil con su parada preparada24 y arbitraje de Task/Home antes de admitir la clase en el productor/cohort ordinario. Después siguen nacimientos, cohortes restantes, consumidor fallido/pérdida de dispositivo, publicación pausada, autonomía VFX, coste inicial, cadencia y plataformas. Reutilización caliente de main se hereda de9456d2571; aquí no se mide ni se promete ausencia total de tirones. A6/A/B/C abiertos, D no iniciado y cierre de seguridad f-R3 conservado.

[Recibo y evidencia](performance/native-farm-terminal-game-validation-20261119.json).
