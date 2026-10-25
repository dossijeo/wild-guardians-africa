# Sabana: streaming postmerge

Media día/noche y baja día completan dos idas y vueltas de 192 m. Estado de simulación conservado, sin errores registrados, mismos chunks/cámara/target al regresar. Llamadas y triángulos de retorno coinciden con la salida. Tras la primera descarga, los contadores de recursos se estabilizan: media 173/174 geometrías y 87/91 texturas según destino; baja día 152 geometrías y 85/89 texturas. Estos contadores no son bytes de VRAM ni prueban ausencia de fugas a largo plazo.

Chunks listos en aproximadamente 1,1–1,6 s en estas muestras; farReadyMs incluye la preparación anterior, settledMs incluye además 90 fotogramas estables. No sumar esos tiempos como fases independientes.

Inspección visual del retorno diurno medio: cobertura, cultivos, edificios y sombras presentes. Diferencia inicial/retorno: unos 7000 píxeles diurnos con cambios de intensidad pequeños y dispersos; no equivalencia exacta. Entre ambos retornos solo 2 píxeles en media día, 4 en noche y 0 en baja día. Ver return-images.json, return-repeat.json y diferencia amplificada. Causa de la diferencia inicial no aislada.

La fase baja noche se interrumpió por destrucción del contexto de ejecución de la página. No se considera aprobada; interruption.json conserva el fallo y la repetición se realiza en sabana-streaming-retry. No sobrescribir esta evidencia ni interpretar la interrupción como prueba de un fallo del renderer sin diagnóstico adicional.
