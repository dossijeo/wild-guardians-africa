# Streaming de tierra V2 integrada

72capturas/36parejas, QA V2 frente a opción integrada; baja/media, día/noche, semilla7121280×720. Dos circuitos±192m por fase, nueve vistas y cambios efectivos de origen. Cámara, objetivo, origen, chunks, calls, triángulos, instancias near/far y buffer de cobertura coincidentes. Sin erroresGPU/página ni overflow.

24parejas RGB exactas; restantes máximo10píxeles, diferencia máxima1nivel RGB. No equivalencia matemática total. Tira de regresos diurnos media inspeccionada sin saltos visibles de suelo/cobertura a esa escala; no inspección exhaustiva de72capturas.

Regresos nocturnos al inicio MAE0–0.000002532. Día baja0.00799732 en ambas variantes; media aproximadamente0.01231 en ambas. La prueba no aísla la causa del residuo diurno, pero no observa diferencia material entre recetaQA e integrada.

Tres texturas adicionales, cada una con un evento dispose, BiomeGround disposed=true y remainingLayers=0 en las cuatro sesiones. Contadores nocturnos de retorno estables:61geometrías/46texturas en baja;81/48 en media. Las sesiones empiezan con más recursos y el control tiene algunas texturas adicionales transitorias; no se demuestra igualdad de VRAM ni ausencia de fugas prolongadas. Este recorrido no es benchmark GPU/CPU.

Recomendación: conservar opción integrada. Pendientes coste integrado, perfil muy bajo en GPU y la mejora artística de la transición amplia del poblado. CubiertaC/viento8/paleta y desgaste de cobertura siguen mediante ayudantesQA iguales en ambos lados; no se modifica simulación ni geometría autoritativa.

Reproducir: `node tools/experiments/capture-river-soil-integrated-streaming.mjs` y `python tools/experiments/package-river-soil-integrated-streaming.py`, Vite5190. Datos captures.json,summary.json y cuatro disposal.json; PNG locales y tiras de retorno versionadas.
