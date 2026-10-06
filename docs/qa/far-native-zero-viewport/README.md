# Preparación sin variantes adicionales de render target

2026-10-06. Misma fixture nativa aislada, servidor 5191, 1280 × 720, DPR 1. Se sustituyó el render target temporal por una pasada con viewport y scissor de tamaño cero y autoClear=false, conservando el destino normal. La función restaura viewport, scissor, scissorTest, autoClear y padre del root en un bloque finally. No asigna ni cambia render targets y sigue esperando una fence mediante consultas no bloqueantes.

La causa de las variantes anteriores está en Three r180, WebGLPrograms/getParameters y WebGLRenderer/setProgram: un render target normal selecciona LinearSRGBColorSpace, independientemente del colorSpace asignado a su textura. Mantener el destino evita esa receta diferente. No se usaron flags XR ni propiedades internas del renderer para forzar la selección.

before-report.json: ready=0, instancia empaquetada, dos programas y dos llamadas. ready-report.json / ready.png: ready=1, cobertura nativa=1, tres programas, tres llamadas, webglError=0, errors vacío. console.json vacío. La prueba anterior terminaba con seis programas. Esto acredita la eliminación de tres variantes en esta fixture; no mide su ahorro de memoria ni FPS.

El tiempo total registrado es 557,90 ms. Es una ejecución única con cachés posibles del navegador/driver y otros procesos activos. No comparar porcentualmente con las muestras anteriores ni atribuir todo el tiempo a compilación. Los atlas ya se usaban para renderizar el impostor; sigue sin ser una carga completamente fría de todos los recursos.

`node --test tests/native-far-gpu.test.js tests/native-tree-coverage.test.js`: 11 aprobadas, 0 fallidas, 429,35 ms. Además de cobertura, empaquetado y pivote, los dobles verifican rectángulos cero durante la pasada, restauración de rectángulos no triviales al completarse/fallar y eliminación de la fence al cancelar durante polling. La captura acredita retorno a renderizado visible después de restaurar.

Sigue siendo experimental. WorldScene todavía no utiliza la preparación ni el paisaje lejano. La pasada recorre la escena y no prepara variantes no empaquetadas/culladas, ni cubre cámaras ArrayCamera/XR o callbacks de escena que alteren el estado del renderer. initTexture y las subidas de buffers aún necesitan presupuesto y medición de latencia por frame. La diferencia de silueta durante el crossfade, pruebas móviles, sombras y la carga en frío integrada continúan pendientes.

Se verificó también que las dos campañas largas siguen vivas: PID 43068, sabana/mapungubwe, día 26; PID 20608, manglares/saheliana, día 90. Sus snapshots siguen en estado running; no acreditan todavía completar 100 noches y corresponden a bases congeladas anteriores.
