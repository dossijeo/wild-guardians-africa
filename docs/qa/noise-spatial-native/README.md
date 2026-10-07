# Ruido fino: comparación espacial nativa, sin aprobación

Sabana/Mapungubwe, seed 712, calidad media, framebuffer 1600×900. Veinte vistas
en tres fases (día, transición y noche): diecisiete posiciones desde X=-160 a
160, origen incluido, y edificios, trabajadores/bestias y estados de cultivos.
Coordenadas solicitadas y cámara efectiva constan por muestra. El volumen R8
periódico de 64³ ocupa 262144 bytes de datos, no una medición de memoria GPU.

La fixture ejecuta A/A/B/B/A dentro del mismo programa de shader envuelto para
QA; A es su rama analítica y B su rama de volumen. No demuestra equivalencia
de A con el shader de producción sin envolver. La simulación no avanza: elapsed
permanece en cero, el estado lógico se restaura y sus hashes se comprueban.
Sesenta vistas terminadas, sin errores capturados ni cambios de calls/triangles
entre los cinco fotogramas de cada vista. Esto no mide tiempos de GPU/CPU.

Los controles repetidos tienen diferencias RGB: A1/A2 en 57 vistas, B1/B2 en
59 y A2/A3 en las 60. Máximos respectivos: 862/874/869 píxeles y MAE local
normalizado de 0,04070/0,07562/0,04070 en ventanas de 16×16. A2/B1 cambia hasta
99738 píxeles. No atribuir toda diferencia al volumen ni aprobarlo por el MAE
global pequeño: investigar la variación de controles y revisar imágenes por
región antes de activar una optimización. No se guardaron framebuffers completos;
los hashes y métricas no sustituyen una aceptación visual.

El informe comprimido conserva las 300 muestras, hashes RGBA y métricas RGB
(alpha se registra por separado), bounding boxes y errores locales, incluyendo
ventanas incompletas del borde. `receipt.json` vincula informe y fuentes exactas
sobre main a7e8c45a, con estos cambios QA aún sin commit en la captura. Siete
tests dirigidos de volumen/métricas pasan; módulos y script inline sintácticamente
válidos. No hay imports desde el juego real ni activación de ruido volumétrico.

La pestaña y WorldScene se cerraron tras exportar. Pendientes controles estables,
inspección visual, coste integrado por bioma y pruebas móviles.
