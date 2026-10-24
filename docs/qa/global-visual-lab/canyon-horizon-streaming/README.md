# Recorridos con sombras de horizonte integradas

Gran Cañón media,seed712,1280x720,día150/noche350. Control sin opción y candidata canyonShadows=horizon. Dos recorridos0→z+96→z+192→0 por fase:32 capturas,16 parejas y cuatro regresos por variante. Se espera la finalización de chunks/horizon en cada parada; no vídeo continuo ni prueba de frametime.

Cámara,objetivo,hora,claves de chunks y contadores del pase final coinciden entre variantes.25 chunks activos en todas las paradas. Flag de emisor correcto en cada horizonte nuevo (34404 triángulos). Las estadísticas de shadow cache registran reconstrucciones al viajar y aciertos entre cambios; cero emisores no rastreados y cero errores WebGL. Revisión de lámina día z+192 sin agujeros nuevos visibles en el suelo; no certifica toda unión de mallas ni todos los ángulos.

Al volver en pasos3 y7:control88 geometrías/57 texturas, candidata88/56, estables en día y noche. No interpretar la diferencia de una textura como ahorro de VRAM: varía la residencia/historial de subida. No crecimiento en cuatro regresos no prueba ausencia de fugas en partidas largas.

Tiempo combinado de espera de streaming, render y auditoría en paradas con viaje:control369–753ms,candidata376–753ms. Es latencia de salto de cámara con trabajo mezclado, NO coste por fotograma ni GPU; no inferir FPS. Rendimiento del mapa separado en ../canyon-horizon-caster/performance/README.md.

La opción integrada conserva el comportamiento esperado tras reemplazar chunks. Mantener opt-in para revisión. Pendiente movimiento continuo y revisión visual global seis biomas; no main ni objetivo completo.

Reproducir Vite5190: `node tools/experiments/trace-canyon-horizon-streaming.mjs`; `python tools/experiments/audit-canyon-horizon-streaming.py`. Publicadas metadata y diez láminas seleccionadas; PNG fuente locales regenerables. Simulación pausada, ninguna regla alterada.
