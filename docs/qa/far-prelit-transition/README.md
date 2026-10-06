# Bruma residual y orientaciones — visor experimental

QA aislada; no integrado en gameplay. URL: `tests/browser/far-vegetation-transition.html?lighting=real&population=single&prelit=1&yaw=90&scale=anisotropic&haze=1`. Para orientación opuesta usar yaw=180 sin scale. Parámetros `fogNear`/`fogFar` configurables, validados como números finitos y far>near. El botón permite comparar con la niebla anterior 120–300.

La opción usa THREE.Fog existente en ambos materiales y terreno, cambiando únicamente sus distancias a 30–300 por defecto. No añade ruido, textura de bruma, shader nuevo ni pasada. Niebla se reduce a cero cerca según profundidad en cámara (no distancia radial); valores experimentales, no política definitiva del mundo.

Capturas nativas: pares modelo/impostor a yaw 90° con sx .8, sy 1.15, sz 1.25, y yaw 180° uniforme. Cámara [0,14,50], fases de día/noche. Persisten diferencias de copa/base y sombreado por perspectiva/elevación, anisotropía y orientación de luz horneada. La bruma atenúa contraste pero NO demuestra sustitución imperceptible. Revisar especialmente selección angular bajo escala anisotrópica antes de integración.

Retención: `yaw90-held-near` mantiene impostor 100%, modelos 0 cuando ready=0 a 25 m. `yaw90-ready-near` registra una etapa parcial de entrada (ready≈.08), no el final. `yaw180-night-near` confirma ready=1, impostorVisibility=0 y un modelo cercano. `yaw90-night-transition` se capturó aún durante la rampa de preparación (~.95); no atribuirle crossfade exacto 50/50. GL0 en todos los reportes; consola final vacía. Prueba con botón de preparación artificial, no chunks de gameplay tardíos.

Ocho lotes nativos alternados, 1008 impostores precocinados, mediodía, cámara fija [0,25,100], 1280×720 DPR1, 45 warmup y 180 muestras/lote. Sin disjoint ni queries pendientes, GL0. Dos calls, 2018 triángulos, tres programas y siete texturas en cada lote. Medianas GPU sin bruma adelantada: 1.115 / 1.155 / 1.154 / 1.160 ms; con ella: .908 / 1.151 / 1.152 / 1.159 ms. La primera pareja varía más; las centrales son prácticamente iguales. p95 alcanza 1.255 ms en un lote con bruma frente a 1.217 ms máximo sin ella. No es prueba de coste exactamente cero ni de rendimiento móvil/general.

Fuentes del ensayo comprimidas y hashes adjuntos. Capturas anteriores a añadir botón de medición/contadores, con mismo render; no cambios ni builds durante los lotes. No cambió código del juego. Campañas confirmadas vivas: PID43068 día23 y PID20608 día86; ambas sin resultado final.
