# Auditoría del recurso de musgo y su escala

Se inspeccionaron los mapas originales de Moss002 referenciados por public/content/ground-materials.json,con hashes reproducibles en report.json. La imagen ARH contiene acumulaciones amplias;el albedo es mucho más fino. La escala.115 equivale a8.70 unidades de mundo por repetición;la secundaria.57 del experimento equivale a15.26. Variar la escala conserva la misma estructura de cada mapa.

Inspección de groundMaterial417:la rama uGroundPureMoss retorna tras muestrear color,normal yARH. No ejecuta POM. Su normal se atenúa según huella de píxel(.12–.60),yAO usa el canalR. El canalB de altura no altera superficie en esa rama;las candidatas lo utilizan para escoger entre orientaciones. Esto explica por qué cambiar mezcla no crea volumen geométrico nuevo.

Análisis FFT por12 sectores,en frecuencias4–64 ciclos por tile:sector máximo de alturaB12.1% frente a8.3% uniforme;albedo10.3–11.1%. Es una anisotropía moderada,no prueba de que toda la imagen tenga filas fuertes ni de periodicidad dominante. Los componentesXY de normales son naturalmente direccionales por ser derivadas;su19.2/17.7% no debe interpretarse como defecto independiente. La apariencia en juego puede amplificar la repetición con iluminación,escala yperspectiva. No atribuirla solo al archivo original.

Decisión:evitar seguir cambiando solo el ángulo. El siguiente experimento útil debe variar la fase/distribución espacial del muestreo con continuidad entre regiones,conservando la coherencia de color,normal yARH. Comparar frente a la candidata de dos escalas,sin cambiar máscaras ni aumentar normalBoost para ocultar el problema. Esto es dirección de próxima prueba,no implementación completada.

El análisis no mide calidad artística,GPU ni memoria. No modifica assets ni licencias. Las fuentes siguen siendo las del repositorio. Reproducir:

```text
python tools/experiments/audit-moss-source-20261021.py
```

La salida incluye mapas referenciados,hashes,escala ymétricas completas. Sin cambios de main ni runtime.
