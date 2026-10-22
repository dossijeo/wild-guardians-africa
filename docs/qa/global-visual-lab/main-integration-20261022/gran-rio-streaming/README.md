# Gran Río: revisión parcial de streaming

Media día y noche completan dos idas y vueltas de 192 m sin errores ni cambios de simulación. En el origen se conservan 91 llamadas y 575977 triángulos; tras descargar por primera vez, ambos retornos muestran 177 geometrías y 93 texturas. No se deducen bytes de memoria ni ausencia de fugas a largo plazo.

Revisadas visualmente las capturas media-day-4 y media-night-4: cobertura densa, caminos, edificios y sombras presentes; los cultivos pequeños mantienen contraste escaso, especialmente de noche. Esto sigue siendo una limitación artística y no se resuelve reduciendo cobertura.

Entre los dos retornos cambian dos píxeles tanto de día como de noche. Entre carga inicial y primer retorno diurno cambian 9985 píxeles, principalmente puntos dispersos; delta máximo de canal 113. Ver return-images.json y return-diff-x5.png. No afirmar identidad píxel a píxel ni atribuir causa sin prueba adicional. Baja aún en curso al escribir este documento.
