# Migración a presentación con animaciones precalculadas: auditoría inicial

Estado: investigación y prototipos; no se ha activado una sustitución de producción. Rama `codex/guardian-3d-animation`. La simulación, navegación, daño y tiempos de juego mantienen sus reglas actuales. La migración de movimiento autoritativo a Worker sigue abierta y es independiente de la presentación visual.

## Comparación A/B/C/D existente

[Estado del experimento](animal-cost/STATUS.md): el ensayo de 16 animales usa Wild Engine real y tiene pilotos A y B, no una comparación equilibrada completa. A 400 pasos y 1600×900, los pilotos registraron 15,22 y 18,90 FPS medios; no permiten atribuir causalidad, y faltan C, D, repeticiones equilibradas y validación gráfica. No se ha ejecutado ni modificado el ensayo durante esta auditoría. No hubo impactos ni ragdolls activos, de modo que no sirve de referencia para ellos. Las variantes mantienen modelos canónicos para física y soporte; por tanto, tampoco miden el ahorro real de memoria de sustituir activos.

## Qué ocurre hoy

| Sistema | Trabajo actual | Dependencias y oportunidad |
| --- | --- | --- |
| Locomoción y ataque | `animalPose` selecciona clip y tiempo; `applyAnimalPose` ajusta acciones y usa `AnimationMixer`, corrige cascos/postura y llama a `groundAnimal`. `sampleFixedPose` evita reevaluar tiempos idénticos, pero no elimina el resto de la presentación. | Los clips ya existen y pueden muestrearse en autoría; antes de sustituirlos hay que preservar efectos procedurales, transiciones, raíces y fases. |
| Apoyo | `groundAnimal` recorre muestras de piel deformada; `GroundSkinSampler`, activado por defecto salvo `animalGroundFast=0`, reutiliza filas de matrices para altura. Después `supportAnimalOnTerrain` evalúa muestras de pies en mundo y consulta terreno. | La primera corrección y la adaptación a pendientes son diferentes; no basta con conservar una altura plana. Puntos precalculados requieren comparación de penetración y deslizamiento por especie. |
| Física, caída y recuperación | `BeastCombatPhysics.step` usa Rapier para hasta tres bestias articuladas, interactúa con el mundo y actualiza posiciones y fases lógicas. Las caídas precocinadas son fallback con límite adicional. `BakedBeastFall`, `AuthoredBeastRecovery`, `BeastRecovery`, `BakedSolidContacts` y `SkinContactBounds` aún muestrean geometría, terreno y obstáculos; la caída precocinada puede actualizar X/Z lógicos. | No se puede reemplazar toda la física por una animación visual sin resolver impactos consecutivos, cuerpos, obstáculos, desplazamiento y determinismo. Se necesita mantener la ruta física para casos no demostrados. |
| GPU y matrices | Three.js calcula matrices de huesos en CPU (`Skeleton.update`) y actualiza su textura; la deformación de vértices ya se ejecuta en shaders WebGL. Materiales y sombras tienen sus propias rutas y parches. | Una textura de animación compartida podría eliminar evaluación y subidas por actor; hay que validar interpolación, sombras, AfricanToon, morphs, selección y origen flotante. |
| LOD | `CharacterLod` cambia visibilidad por tamaño proyectado e histéresis; conserva el rig canónico, copia transformaciones y enlaza huesos originales. | Reduce geometría dibujada, pero sigue evaluando la pose y no es un LOD temporal o de huesos. |
| Guardián | `guardianPlacement` evalúa anillos, proyecciones, ocupación y rayos; `GuardianSummons.plan` mantiene un índice de edificios, añade murallas y consulta props. Un comando planifica una vez; la guía persistente puede replanificar con movimiento de cámara, como máximo cinco veces por segundo. | Una entidad etérea permite ensayar pocas alternativas y una elevación segura, pero deben comprobarse visibilidad, recorte, UI, obstáculos y cámaras. No se ha medido aquí el coste total de esa sustitución. |

## Activos y coste inicial

`public/content/guardian/ragdoll-fallback/falls.bin` ocupa 1.505.280 bytes: 40 clips, cinco especies, ocho direcciones, 20 muestras/s y duraciones 2,15–8,8 s. Son posiciones y cuaterniones de 14 huesos en espacio mundial de captura (`bone-world`), horneados en suelo plano: no son una textura de matrices GPU ni prueban adaptación a obstáculos o intensidad arbitraria. `tools/guardian/bake_ragdoll_fallback.mjs` genera el banco con Rapier y valida reposo/rodamiento. El banco de recuperación `recovery.bin` ocupa 1.137.136 bytes y contiene cinco clips de canales de posición/cuaternión; se decodifica en `AnimationClip` compartidos. Esas cifras son tamaño en disco, no memoria viva, coste de transferencia GPU ni picos de compilación.

En preparación, `BeastCombatPhysics.create` precalienta rigs, muestras de contacto y Rapier durante la carga; `animalPreload` reserva rigs y texturas óseas. Hay que incluir esa preparación, la memoria compartida por especie, la memoria por instancia y la reposición de recursos al comparar. La textura GPU de poses podría aumentar memoria y ancho de banda aunque reduzca CPU. El tamaño exacto depende de huesos, clips, frecuencia, formato, transición y compatibilidad del dispositivo.

## Evidencia existente y límites

En una escena congelada de manglares de islotes con 20 animales, [el informe previo](phase2/native-directional-cycles/declarative-mobility-contract.md) registró 21 actualizaciones de actor y 20 de apoyo por fotograma; p95 de `updateActor` 18,30 ms y de soporte 2,37 ms, tiempos anidados. Es una sesión instrumentada con GTX 1660 y reloj parado: no acredita un resultado en incursiones activas ni en Intel UHD. Las pruebas anteriores de desplazamiento por shader usaron pose fija y no son reproducción esquelética GPU. Los datos de A/B/C/D deben mantenerse separados.

## Orden de investigación

1. Conservar la prueba A/B/C/D sin modificaciones y establecer una referencia propia de la migración con escena, comandos y captura reproducibles; incluir CPU de mixer, grounding, apoyo, física, matrices, GPU, transferencias, memoria e inicialización, con p95/p99 y las condiciones de hardware.
2. Diseñar un horneado reversible para una especie y un clip: conservar jerarquía, orden y bind de huesos; separar raíz lógica y pose local; validar muestras exactas y error entre muestras antes de llevarlo a GPU. La caída `bone-world` y la recuperación deben tratarse como formatos distintos hasta una conversión validada.
3. Prototipar WebGL2 con varias instancias y biblioteca compartida, sin cambiar la simulación. Comparar color, profundidad y sombras con el rig original; incluir coste de preparación y subida. No dar por cubierta la física, morphs, contactos ni el ciclo de vida.
4. Probar frecuencias temporales, puntos de apoyo y colocación directa del guardián como experimentos independientes. Mantener las rutas originales y rechazar cualquier variante con regresión visual o física, o sin beneficio medido.
5. Ampliar solo después de superar las pruebas de especies, pendientes, impactos, obstáculos, multitudes, campañas y GPU integrada. No se han retirado rutas anteriores ni cambiado `main`.
