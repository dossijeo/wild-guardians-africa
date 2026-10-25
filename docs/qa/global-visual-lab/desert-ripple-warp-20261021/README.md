# Desierto: deformación amplia de ondulaciones, no promovida

Seis parejas reales, semilla 712, media, 1280×720, tres cámaras, día/noche. Izquierda original V10, derecha deformación UV del normal map existente. No cambia color base, geometría, sombras ni reglas. La misma máscara de desgaste y el mismo filtrado por distancia permanecen activos. Cámaras, objetivo, hora, triángulos y calls coinciden en las seis parejas; sin errores capturados.

La candidata suma tres senos de baja frecuencia en coordenadas de mundo antes de calcular derivadas UV. No añade muestras de textura, pero sí aritmética. No se midió rendimiento: GPU ocupada externamente en las comprobaciones recientes. No se descarta por rendimiento.

Revisión diurna y nocturna: rompe la dirección uniforme, pero estira demasiado el patrón y genera bandas peinadas en el patio y zonas laterales. No ofrece una mejora artística suficiente: no promover. Se conserva el experimento como evidencia. La transformación no restringe el Jacobiano y mantiene el marco tangente anterior; debe corregirse la coherencia de normales antes de considerar una deformación mayor. No subir intensidad para compensar.

Próxima alternativa: deformación acotada respecto a la escala física del tile, con control del estiramiento y transformación coherente del gradiente. La distancia sigue dependiendo del normal map filtrado; esta prueba no añade relieve de silueta ni resuelve las dunas lejanas.

Reproducir capture-desert-ripple-warp-20261021.mjs y package-desert-ripple-warp-20261021.py con Vite 5190. Dos hojas comparativas y metadatos publicados; PNG regenerables. Rama experimental, main y valores predeterminados intactos.
