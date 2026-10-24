# Integración global del contacto — descartada

Ensayo QA del 19 de octubre de 2026. Prioridad: escena completa, sin retocar edificios. Se reutiliza el mapa de contacto R8 de 256² (65.536 bytes) para atenuar la luz directa del suelo con `mix(1,contact,.75)`, además de su contribución ambiente existente. Sin ampliar radios, añadir manchas ni modificar objetos.

## Resultado

No aporta una mejora visible desde la cámara normal. En Sabana de día solo el 0,00445 % de los píxeles cambia más de 3 unidades sobre 255; en los otros biomas el efecto también es insignificante. El atlas actual concentra contacto bajo las bases; reforzar su contribución no crea la estructura de sombras amplias del mockup. No se adopta ni se ensanchan los radios a ciegas.

48 capturas WebGL: seis biomas, cámaras de juego/baja, día/noche, original/candidata. Semilla 712, cultura Mapungubwe, calidad media, 1280×720. `captures.json` registra cámara/hora/contadores; `comparison.json` comprueba igualdad de cámaras y recursos y cuantifica diferencias. Cañón usa su encuadre de fixture distinto; la comparación válida es dentro de cada pareja, no entre biomas. Sin errores de navegador/shader.

## Presupuesto y decisión

0 texturas, geometría, draw calls y descargas de recursos adicionales. Una lectura lógica adicional del mapa de contacto por fragmento de suelo; no se afirma coste GPU nulo ni memoria residente medida. No se ejecuta ABBA porque no supera la evaluación artística. Runtime previo y originales intactos.

Reproducir con Vite en 5189 y `node tools/experiments/capture-ground-contact-integration.mjs`. El helper QA se importa explícitamente; el parámetro URL solo no activa el ensayo.
