# Ensayo descartado: dithering angular

Candidato no aceptado y retirado de las fuentes activas. Los archivos gzip conservan exactamente el shader y visor probados para reproducir el diagnóstico.

Se ensayó selección de vista por píxel con coverageThreshold(gl_FragCoord+vec2(3,5)), en lugar de mezcla continua de color. Se muestrean ambas vistas antes de seleccionar para conservar derivadas/mipmaps estables; no se acredita reducción del número de lecturas. Uniforme uAngularDither, URL angular=dither; sin cambios de assets ni gameplay.

Prueba nativa: acacia única yaw45, resolución128, cámara [19.134,14,46.194], ángulo intermedio7/0 con mezcla0.5, mediodía, impostor completo sin crossfade de modelo, bruma30–300. La captura muestra trama visible y sigue mostrando siluetas desplazadas. No elimina la diferencia geométrica de dos perspectivas. GL0/errors[], pero consola registra advertencia del compilador sobre retorno potencialmente no inicializado de prelitPair. No se considera shader validado; no se realizaron lotes GPU ni se atribuye mejora de frametime.

Decisión: no sustituir la mezcla activa por este candidato. Próximo ensayo: mayor número de vistas angulares en el atlas compacto para reducir la diferencia entre perspectivas, comparando peso, silueta y coste antes de adoptar. El problema también incluye la diferencia entre cámara ortográfica de captura y perspectiva/elevación del modelo; aumentar vistas no garantiza resolverlo por sí solo.
