# Manglares: mezcla de dos escalas de musgo

Control:dos orientaciones aigual escala. Candidata:segunda orientación90 grados con UV yderivadas multiplicadas por.57;acumulaciones aproximadamente1.75 veces mayores. Se mantienen rotación de normales,mezcla por altura,ruido regional ymáscaras. Sin nuevas texturas,geometría o muestras máximas;la frecuencia de la rama condicional puede cambiar.

Seis parejas reales,semilla712,media,1280×720,tres cámaras,día/noche. Misma cámara,hora,draw calls ytriángulos;sin errores. [Normal diurna](day-0-pair.webp),[elevada diurna](day-1-pair.webp),[normal nocturna](night-0-pair.webp). Izquierda control,derecha candidata.

En la normal diurna revisada se aprecia más variedad de tamaños en primer plano,pero persisten franjas yrepetición. Conservar candidata para revisión,sin sustituir anterior ni declarar alcanzado el aspecto orgánico del mockup. No hay desplazamiento físico nuevo:la escala del normal map es artística,no una reconstrucción de altura calibrada.

Pendientes revisión nocturna detallada,movimiento,transición de escala a distancia ycoste. No se ejecutó benchmark de precisión debido a contención GPU recientemente confirmada. Igual número máximo de muestras no demuestra igual coste. Mantener ambas versiones disponibles;no descartar por rendimiento no medido.

```text
node tools/experiments/capture-moss-two-scales-20261021.mjs
python tools/experiments/package-moss-two-scales-20261021.py
```

Vite5190;archivar salidas antes de repetir. Sin cambios de main,predeterminado ni simulación.
