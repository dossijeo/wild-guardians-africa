# Precondición de la comparación de impostores

Estado: **sin comparación visual válida**, no es una mejora aprobada ni un benchmark.

La campaña real de Sabana, semilla 712 y calidad baja, arrancó correctamente con la preferencia `farVegetation: true`, pero devolvió `spatialSession: true`, `farVegetation: false` y cero adaptadores. [Registro obtenido del navegador](capability.json). No hubo errores de consola anteriores a la comprobación. El capturador termina expresamente con código 1 al detectar esta precondición incumplida.

## Causa comprobada

`src/app/main.js:231` pasa `farVegetation: false` cuando existe una sesión espacial. `prepareWildEngineWorld` crea esa sesión para las partidas actuales. Por tanto, activar la preferencia no activa el antiguo sistema de impostores en esta campaña. No se ha cambiado esta decisión de producción ni la simulación.

La ruta antigua sigue disponible en el repositorio: `NativeFarLayer` crea el prototipo con `nativeModels: false`; `NativeFarCoverage` combina la transición con `nativeVisibility` de las instancias residentes. La mitad nativa usa el descarte de `obstruction.js`, mientras `far-impostor-prototype.js` descarta la cobertura complementaria. Modificar solamente el material nativo interno del prototipo no modifica la ruta real del adaptador.

## Prototipo preparado, aún no ejercitado

`qa-impostor-blend-route.mjs` propone, solo mediante interceptación QA, reutilizar el fundido nativo de superficie cercana y aplicar alpha blending al atlas. Los atlas permanecen agrupados, sin ordenar cada árbol. La profundidad auxiliar nativa puede impedir que el atlas aparezca donde debe mezclarse; árboles superpuestos pueden componer incorrectamente. Son riesgos de esta propuesta, no fallos visuales medidos: la candidata no llegó a dibujarse en esta ejecución.

El capturador verifica ahora la presencia de adaptadores antes de producir capturas, evitando una comparación engañosa entre dos escenas sin impostores. Reproducción con Vite en 5190:

```powershell
node tools/experiments/capture-impostor-blend-pilot.mjs
```

Próximo paso necesario para evaluar esta hipótesis: una escena QA con árboles y atlas de identidad coincidente, que ejercite realmente ambos lados de la transición. No conectar a ciegas el generador regional antiguo a la sesión espacial: debe comprobarse que posiciones, IDs y cobertura corresponden al mismo mundo. Una prueba aislada posterior tampoco equivaldría por sí sola a validar integración en la campaña.

La recomendación para ocultación cercana fue sustituida por la [prueba posterior de transparencias](../obstruction-transparent-probe/README.md): descartar la variante de profundidad compartida como sustitución global. Sus capturas sin impostores siguen siendo evidencia válida del prototipo, pero no justifican integrarlo. Para buscar un fundido suave se necesita composición con profundidad aislada y medir su coste; cambiar a WebGPU por sí solo no resuelve este problema de composición.
