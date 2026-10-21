# Manglares: segunda orientación oblicua

Control:mezcla de musgo con segunda orientación90 grados ymuestreo condicionado. Candidata:45 grados,rotando UV,derivadas ynormales de forma consistente con la convención existente. Sin nuevas texturas,muestras máximas,geometría o máscaras. La rama condicional puede ejecutarse con distinta frecuencia:igual número máximo de muestras no demuestra igual coste.

Seis parejas reales,semilla712,media,1280×720,tres cámaras,día/noche. Misma cámara,objetivo,hora,draw calls ytriángulos,sin errores. [Normal diurna](day-0-pair.webp),[elevada diurna](day-1-pair.webp),[normal nocturna](night-0-pair.webp). Izquierda90,derecha45.

Decisión:conservar como descarte artístico,no sustituir la candidata anterior. En la normal diurna revisada cambia la orientación,pero persiste lectura de filas yrepetición. Diferencia de píxeles considerable no equivale a mejora de volumen orgánico. No se descarta por rendimiento:esta ronda no mide GPU por carga concurrente conocida.

Siguiente dirección:distribución yescala de acumulaciones,evitando seguir rotando una textura cuyo patrón domina el resultado. No modificar siluetas ni terreno autoritativo. El análisis nocturno detallado yel coste no son necesarios para promover esta variante porque no se promueve por resultado artístico insuficiente.

```text
node tools/experiments/capture-moss-oblique-20261021.mjs
python tools/experiments/package-moss-oblique-20261021.py
```

Vite5190;archivar salidas antes de repetir. Predeterminado ymain intactos.
