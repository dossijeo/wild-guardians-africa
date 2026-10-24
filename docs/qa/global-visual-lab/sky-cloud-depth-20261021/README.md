# Cielo diurno: azul y separación de nubes

Seis parejas reales Manglares,semilla712,media,1280×720,cámaras bajas,día/noche. Control panorama original; candidata mezcla gradiente azul según altura,preservando zonas luminosas yneutras como aproximación de nubes. Mantiene ajuste nocturno previo. Solo rutas QA,no cambios de producción ni de texturas de entorno.

Comparativa diurna:azul más presente en vistas abiertas,nubes claras;vista hacia horizonte aún gris. Conservar candidata,no resultado artístico definitivo. Clasificación cromática heurística puede confundir bruma ynubes;validar orientaciones,seis biomas ycrepúsculo.

Sin errores de captura. audit.json registra diferencias;una comprobación de igualdad de mitad inferior falló,por lo que no se afirma aislamiento perfecto de todos los píxeles del mundo. Diagnosticar diferencias de transparencias/fondo antes de integrar. Sin muestras nuevas de textura,pero más aritmética;GPU no medido.

Reproducir capture-sky-cloud-depth-20261021.mjs y package-sky-cloud-depth-20261021.py con Vite5190. V10 ymain intactas,objetivo global pendiente.
