# Variación entre renders: control de MSAA

Sabana/Mapungubwe, seed712/media, mundo detenido, ruido volumétrico desactivado
dentro del shader QA, cámara efectiva fija. Cada informe conserva doce renders
de WorldScene, doce dibujos de cielo/escena y doce lecturas síncronas de un
único framebuffer. Estado lógico idéntico y sin errores en los tres ensayos.

La referencia nativa registra antialias:true y alpha:true. Three solicita
alpha:true para el contexto incluso con su opción de renderer alpha:false.
El primer contexto QA sin MSAA usó alpha:false: se conserva como ensayo con
dos atributos distintos, **no** control aislado de antialiasing. Sus fuentes
y resultados están ligados en initial-receipt.json.

El ensayo corregido usa alpha:true. Todos sus atributos de contexto coinciden
con la referencia salvo antialias:false; sus matrices de cámara coinciden
exactamente con la referencia y dentro del ensayo. matched-receipt.json liga
la versión corregida de la fixture y los artefactos. La precreación de contexto
es exclusiva del flag qa-no-msaa=1 de la fixture: no cambia WorldScene ni las
opciones del renderer del juego, y el guard de recursos se instala antes de
que Three cree recursos gráficos.

Diferencias RGB entre dibujos consecutivos de cielo/escena:

- Referencia con MSAA: 3,7,4,7,7,0,2,2,5,5,0 píxeles.
- Sin MSAA, alpha igualado: 12,11,0,1,2,7,9,5,8,1,12 píxeles.
- Primer ensayo con alpha distinto: 0,5,3,0,5,7,9,9,6,5,9 píxeles.

La comparación del primer dibujo de cada ruta con la ruta anterior se conserva
en los JSON, pero no se incluye en estas series consecutivas de once valores.
Las doce lecturas del mismo buffer coinciden byte por byte en los tres ensayos.
MSAA no explica por sí solo la variación de render en esta vista. No identifica
todavía geometría, materiales, shaders o rasterizado como causa concreta.

El diagnóstico de solo dibujo también ajusta ahora los rectángulos del horizonte
al origen relativo, como la ruta nativa. Sigue omitiendo updates de entidades,
materiales/luces y preparación de efectos/profundidad/humo: no se acepta como
sustituto de render. Sabana aquí no usa ese material de horizonte; la corrección
no es evidencia visual de otros biomas.

Framebuffer1600×900, capturas viewport1280×720; 108 filas totales conservadas.
Sin timings GPU, aceptación móvil, comparación de calidad de MSAA, aprobación
de FrontSide ni del ruido volumétrico. Mundos/pestañas706–708 cerrados. Módulo
e inline script de la fixture pasan node --check; diff check correcto.
