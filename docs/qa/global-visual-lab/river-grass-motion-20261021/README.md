# Gran Río: secuencia de LOD y viento

Original a la izquierda y candidata viento+normales+pigmento a la derecha. Campaña real pausada,semilla712,media,1280×720,36 poses por fase,desplazamiento lateral de cámara12 unidades y viento8 con tiempo2+i/12. Se preservan paleta,desgaste y módulos originales.

Auditoría:72 parejas con cámara,objetivo,hora,tiempo de viento,draw calls,triángulos e instancias near/far iguales; sin errores observados. Selección cercana3778–4631,lejana5845–7489;279376–328052 triángulos de cobertura según pose. Esa variación confirma cambios de selección durante el recorrido, no una escena inmóvil.

- [Vídeo diurno](media-day.mp4)
- [Vídeo nocturno](media-night.mp4)
- [Contacto diurno](media-day-contact.webp)
- [Contacto nocturno](media-night-contact.webp)
- [Pareja central diurna](media-day-017-pair.webp)
- [Pareja central nocturna](media-night-017-pair.webp)

Vídeos montados a12fps,3 segundos,1920×540;36 frames verificados con ffprobe. Cada pose espera chunks: no representan rendimiento en tiempo real ni latencia de streaming. Los contactos revisados conservan continuidad general de cobertura y caminos; la noche sigue oscura. Esta inspección de frames no certifica ausencia de popping o shimmering a velocidad real. No usar diferencias de píxeles como puntuación artística.

Conservar candidata QA. Antes de promover: revisión temporal fina en juego y comparación global de los seis biomas. El [benchmark separado](../river-grass-lod-equivalent-20261021/performance/README.md) presenta GPU diurna favorable,CPU similar y cadencia nocturna igual,con limitaciones de residencia y variación entre bloques. No se repite ni sustituye aquí con el tiempo de generación del vídeo.

```text
node tools/experiments/capture-river-grass-motion-20261021.mjs
python tools/experiments/package-river-grass-motion-20261021.py
```

Vite5190 y ffmpeg en C:/ffmpeg/bin. Archivar salidas antes de repetir. Predeterminado intacto, sin cambios en main ni simulación.
