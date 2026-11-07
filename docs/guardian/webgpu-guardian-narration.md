# Narración del guardián en el Worker gráfico

El audio permanece en el hilo principal. `setGuardianNarration(record, audio)`
transmite únicamente la identidad del clip y muestras del reloj multimedia al
Worker gráfico: como máximo diez muestras por segundo durante reproducción,
con envíos inmediatos al cambiar clip, pausar, reanudar, buscar o finalizar.
No transmite el elemento de audio y no reenvía muestras vacías o pausadas que
no hayan cambiado. La reproducción detenida por falta de datos se trata como
pausa. El Worker descarta secuencias antiguas y extrapola el reloj recibido
durante un máximo de 250 ms; si dejan de llegar muestras la boca no continúa
animándose indefinidamente.

El modelo WebGPU usa `GuardianFace` y sus mismos datos de visemas para la guía
y los gestos, manteniendo la generación que impide que una carga antigua
sustituya el clip actual. Las pruebas cubren el protocolo, cambios de voz,
pausa, espera de datos, seeks, final, muestras fuera de orden y la aplicación
de visemas a una malla con morph targets. Son pruebas con renderizador simulado:
la sincronización audiovisual y la apariencia todavía necesitan validación en
una partida WebGPU real. No se ha medido el coste de los mensajes ni de la
evaluación facial. El llamador debe proporcionar muestras del audio vigente y
una muestra vacía al dejar de narrar; el cliente reemplazado no debe seguir
recibiéndolas.

Si el audio se pausa o espera datos durante una pausa marcada del guion, el parpadeo asociado a esa pausa deja de mantener cerrados los ojos; los visemas siguen conservando la posición del reloj de audio. Al reanudar se vuelve a evaluar la pausa vigente. Una prueba de la cara y las pruebas del puente Worker cubren la transición con audio simulado; queda pendiente la validación audiovisual en navegador. La evaluación facial continúa en CPU dentro del Worker gráfico.
