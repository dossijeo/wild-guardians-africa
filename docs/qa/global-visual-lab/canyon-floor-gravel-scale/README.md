# Gran Cañón: escala legible de tierra y grava

Ensayo QA sobre Ground079S existente: escala UV0,20→0,08 (periodo5→12,5m; rasgos2,5× mayores). Color, normales y ARH mantienen coordenadas coherentes; normalBoost1,35 y relief0,10 no cambian. El desplazamiento UV del POM ya incorpora la escala, por lo que no se multiplica arbitrariamente su profundidad física. No añade geometría, instancias, texturas, pasadas ni muestras previstas por shader. No demuestra coste GPU idéntico: mips/caché y salidas del POM pueden variar.

Ambas variantes tienen visualLab=global-lighting y la receta cálida del suelo. La textura independiente de paredes, edificios, personajes y cámara permanecen iguales. La ruta QA intercepta ground-materials.json antes de cargar; no modifica el manifiesto de producción.

## Evidencia

24 capturas reales,12 parejas: campaña Gran Cañón semilla712, media/baja,1280×720, tres cámaras, día150/noche350. Comparación automatizada de cámara, objetivo, hora, calls y triángulos: iguales en cada pareja; cero errores. Vista normal media39draws/399675triángulos; baja36/335551. Individuales WebP RGB sin pérdida verificados; composiciones `*-pair.webp` reducidas, izquierda original/derecha candidata. Datos completos en captures.json/comparison.json.

La vista normal muestra grava reconocible en la ribera y evita parte del aspecto uniforme anterior. Mantiene calidez en sombra, paredes y lectura de edificios. La cámara oblicua contiene mucho edificio/agua y no debe tomarse como evaluación exhaustiva de primer plano. En baja nocturna aumenta el moteado; la variante aún no aporta acumulaciones ni relieve mesoscópico, solo una mejor escala de detalle. No confundir una mayor diferencia de píxeles con volumen logrado.

**Recomendación:** conservar como candidata QA para revisión conjunta, sin integración. Falta primer plano del suelo despejado, movimiento para evaluar aliasing/repetición y coste medido en el presupuesto combinado. No seguir aumentando escala o normalBoost para forzar volumen. Si se busca estructura mayor habrá que estudiar deposición/erosión coherente con orilla y pendiente, conservando geometría autoritativa.

Reproducir: Vite5190; `node tools/experiments/capture-canyon-floor-gravel-scale.mjs`, después `python tools/experiments/package-canyon-floor-gravel-scale.py`. WG_COVER_QUALITY permite seleccionar perfil. No hay nuevos recursos externos ni cambios de licencia: reutiliza los assets del juego.
