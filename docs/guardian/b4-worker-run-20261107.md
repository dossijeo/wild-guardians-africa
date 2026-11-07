# Carrera de trabajadores en GPU

Los cuatro perfiles disponen de una biblioteca `Run` precocinada con el generador de caminata existente. El banco se solicita al correr y comparte datos por perfil; las transiciones conservan el rig CPU como fallback. El reproductor corrige al activarse la transformación del padre para que la pose y el proxy de selección usen la misma referencia. Las trayectorias históricas emplean la fase `runPhase` confirmada y rechazan cambios ambiguos; una pose estacionaria solo se conserva si la fase no cambia.

Los cuatro bakes de 37 716 bytes se regeneran con `tools/guardian/build-worker-gpu-walk.mjs --clip=Run --check`; el mismo `--check` verifica que la marcha previa sigue reproducible. Las pruebas comparan poses CPU y proxy, generan WGSL de color/sombra sin dispositivo y cubren admisión, cancelación, transición, picking y tiempo confirmado. No demuestran paridad visual, compilación en GPU ni mejora de rendimiento en una partida.
