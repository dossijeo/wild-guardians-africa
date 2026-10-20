# Gran Río: altura progresiva en la frontera de desgaste

El borde cercano permanecía marcado tras ampliar la transición por distancia. El selector original excluye módulos con desgaste central>.25 o con cualquiera de ocho muestras de huella>.27, pero los aceptados conservan altura sin transición por desgaste.

La candidata mantiene esas exclusiones y calcula el máximo del desgaste central y las ocho muestras existentes. Multiplica la altura por clamp((.27−máximo)/.17,0,1): altura completa hasta.10, reducción hacia el umbral. No añade consultas de navegación, puntos de distribución, geometría ni trabajo por frame. El cálculo ocurre al crear tiles visuales. La ruta de captura intercepta únicamente el helper QA de cobertura; no modifica el juego ni el helper original.

24 capturas,12 parejas, semilla712,1280×720,media/baja,normal/oblicua/inversa,día/noche. Viento8 fijo en tiempo2. Cámara, hora, draw calls, triángulos, instancias y bytes nominales de atributos idénticos por pareja; errores0, overflow0. Vista normal media:66draws/869817triángulos/4147cercanas+5187lejanas. Baja:62draws/504136triángulos/5123lejanas. Composiciones `*-pair.webp`: izquierda original, derecha candidata. Individuales RGB sin pérdida verificados.

**Revisión visual:** el corte cercano es menos parecido a una pared de hojas, especialmente en cámara oblicua. La zona interior conserva densidad y volumen, y no se extiende cobertura sobre caminos. Sigue existiendo diferencia cromática con el terreno sin cobertura; este ensayo no la resuelve. Se conserva como candidata, no integrada.

Coste pendiente: el máximo calcula las ocho muestras también en los candidatos que el original descartaba con cortocircuito. Contadores acumulados observados al primer encuadre diurno: preparación51,99→56,80ms media y33,50→43,00ms baja; selección51,00→60,20ms y30,50→41,30ms. Son ejecuciones separadas sin ABBA ni aislamiento: no atribuir causalidad ni convertirlos en ms/frame. No se ha medido GPU. Aunque se envían los mismos triángulos, su menor área proyectada puede reducir fragmentos: no sería una optimización a imagen idéntica.

Siguiente puerta: conservar las muestras ya leídas evitando asignaciones temporales innecesarias, validar en recorrido con viento y medir preparación/selección y render A/B. Después evaluar integración con la revisión conjunta, sin prolongar ajustes mínimos de un solo material.

Reproducción Vite5190: `node tools/experiments/capture-river-grass-wear-blend.mjs` y `python tools/experiments/package-river-grass-wear-blend.py`. El script contiene los anclajes y el reemplazo completo del helper; no depende de editar fuentes de producción. Los JSON conservan todas las poses y contadores.
