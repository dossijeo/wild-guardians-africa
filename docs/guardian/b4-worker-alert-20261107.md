# Vigilancia de trabajadores en GPU

El Worker gráfico solicita bajo demanda el banco compartido `Alert` de cada perfil cuando un trabajador confirmado se encuentra en reposo `watch`. El rig original permanece como alternativa si falla la carga o admisión, cambia la pose o espera ante una puerta. La fase queda fija entre publicaciones y usa las muestras autoritativas de `idleState.elapsed` durante horizontes certificados; un cambio de modo o fase invalida ese tramo.

Los cuatro bancos se generan con `node tools/guardian/build-worker-gpu-walk.mjs --clip=Alert --check` y ocupan 220.908 bytes por perfil. Las pruebas comparan las mallas muestreadas con la pose CPU y comprueban admisión tardía, interrupción e intervalos reales de Wild Engine/WASM frente a una autoridad de referencia. No acreditan apariencia, sombras ni rendimiento en GPU real.
