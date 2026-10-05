# Transporte musical Opus — señal renderizada

Se comparan el transporte de pistas Opus completas y el transporte por ventanas precalculadas, con OfflineAudioContext nativo a 48 y 44,1 kHz. Ambos reciben las mismas pistas, reloj y decisiones de salto. Se conserva el harness anterior de MP3; los inputs son los candidatos Opus y sus índices experimentales.

| Grupo | Casos | Resultado |
| --- | ---: | --- |
| Saltos registrados, retorno al inicio y avance fraccional | 60 | Correcto |
| Entrada de capas, retorno de escena, éxito y derrota | 48 | Correcto |

Los **108 casos** cubren tres stems por conjunto (`s1`, `s2`, `s9`), ambos conjuntos A/B y ambas frecuencias. Se han comparado 198,936,000 muestras de salida; máximo error frente al transporte Opus completo: **2.2351741790771484e-08**. Todas las historias de secciones/jumps coinciden. Console sin avisos ni errores; los contextos de descodificación se cierran.

La prueba planifica fuentes reales, ganancias y fades en el grafo de Web Audio y después renderiza su señal. Una fachada de reloj controlada y la desconexión diferida permiten conservar las fuentes ya programadas hasta terminar el render; ambas rutas usan la misma fachada. Se espera a las cargas antes de avanzar ese reloj. Esto prueba continuidad y sincronización bajo esas condiciones, no ausencia de stalls de red/CPU en tiempo real ni rendimiento en móvil.

Los candidatos se leen únicamente desde la caché en disco creada en los ensayos previos; la prueba rechaza una descarga inesperada. No se activa Opus en gameplay ni se cambia la política de mezcla. Compara **Opus completo con ventanas Opus**, no calidad perceptual MP3→Opus ni escucha física.

Reproducción: ejecutar los dos preparadores experimentales de audio/ventanas, realizar la prueba de ventanas que llena la caché, abrir `tests/browser/opus-music-transport.html` en el servidor local y ejecutar ambos botones. `seams.json`, `scenes.json` y `proof.json` registran resultados y hashes.

Pendiente para integración: catálogo y fallback, distribución de una sola representación por recurso, coste de descodificación/RAM en partida, reproducción/escucha, Chrome móvil desde itch.io y Windows/Tauri. La preparación actual añade márgenes al contenedor; distribuir también los stems originales anularía parte del ahorro.
