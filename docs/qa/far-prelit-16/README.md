# Atlas de 16 vistas × 8 orientaciones

Candidato experimental aislado; defecto de ocho vistas conservado y sin integración en gameplay.

Baker: bake=day|night&rotations=8&resolution=128&views=16. Encadre/localBase/escala idénticos a la versión de ocho vistas. Cámara cada22.5°, ocho orientaciones mundiales ante sol fijo, 128 celdas por fase, atlas2048×1024. Interfaz y nombre de descarga reflejan configuración. La iluminación sigue precocinada con shader nativo.

Día1288762 bytes, noche1110292, par2399054 (2.29MiB), frente1191098 del ocho-vistas128 y3668792 del ocho-vistas256. GPU RGBA+mips estimado21.33MiB, frente10.67 y42.67 respectivamente. No RAM física medida. Conversión lossless preserva alpha y RGBA visible. Todas las celdas contienen geometría, sin clipping horizontal; informes de ambos hornados GL0/errors[], consolas vacías.

Visor: lighting=real&population=single&prelit=rotations&yaw=45&haze=1&resolution=128&views=16. El sampler utiliza16 columnas solo en rama precocinada; albedo/normales originales siguen8 y filas de orientación siguen8. Conserva dos vistas y dos orientaciones por fase:4 lecturas, hasta8 en transición día/noche. Igual número de lecturas no demuestra igual frametime.

Nativo1280×720: yaw45/cámara orbitada22.5° corresponde a vista337.5°, ahora capturada exactamente (15). Desaparece la mezcla de dos siluetas en ese ángulo puntual. Captura amanecer0.5/distancia50/ready1 confirma crossfade modelo-impostor0.5; aún puede diferir la perspectiva/elevación. GL0/errors[], consola vacía.

Comparación adicional yaw56.25, cámara[0,14,50], día:16vistas interpola13/14 al50%;8vistas interpola6/7 al75%, con idéntica orientación/framing. Capturas incluidas; el candidato reduce separación entre perspectivas pero continúa suavizando detalles en ángulos interpolados. No se declara resuelto todo ghosting ni transición imperceptible. Falta rotación continua/lateral, GPU8vs16 en mismo lote, crepúsculo, móvil, integración y presupuesto final.

12 pruebas pasan (843.71ms), ampliando comparación de vista anisotrópica contra inversa de matriz nativa a ocho y dieciséis vistas:512 combinaciones. No modifica generación ni distribución real.
