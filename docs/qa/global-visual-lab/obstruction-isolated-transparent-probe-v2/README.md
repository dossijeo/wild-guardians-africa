# Profundidad aislada frente a transparente posterior

Prueba diagnóstica en Sabana baja, semilla712, vista17, día150. Selecciona una instancia parcial mediante intersección de rayos de pantalla con su bounding box; el centro del objeto puede quedar fuera de pantalla. Opacidad temporal .35. Plano magenta alpha .8 detrás del punto seleccionado. Se desactiva escritura de color de los fundidos en ambas condiciones, conservándolos visibles para ejecutar la profundidad aislada. Así se aísla si la prepasada bloquea otros transparentes.

Cuatro capturas: profundidad aislada activada/desactivada, marcador visible/invisible. Fondos sin marcador: cero píxeles diferentes. Señal de marcador >20 niveles RGB:859680 píxeles en ambas condiciones. Píxeles con señal sin profundidad que desaparecen al activarla:0. Sin errores GL registrados. La lámina isolated-depth-on-off.webp muestra activada izquierda, desactivada derecha. No es la apariencia final: el color de árboles en fundido está desactivado deliberadamente, y el marcador ocupa gran parte de pantalla.

Este ensayo no reproduce el bloqueo de25.431 píxeles medido con la antigua profundidad compartida; escenarios y posición del marcador son diferentes, no comparar porcentajes directamente. La nueva prepasada usa targets separados y restaura el destino principal antes de renderizar. La prueba no certifica humo real, todas las transparencias, orden entre varios árboles, origen flotante ni rendimiento. No es evidencia de FPS.

Se restauran colorWrite, visibilidad de instancia, estado de renderer y se elimina el marcador. El selector inicial basado en centro proyectado falló sin encontrar objeto y no produjo probe.json; esa ejecución se excluye. V2 utiliza volumen visible y completa la medición.

Reproducción: Vite5190; `node tools/experiments/capture-isolated-transparent-probe.mjs`; `python tools/experiments/package-isolated-transparent-probe.py`. Datos probe.json y analysis.json, cuatro PNG y láminas. Conservar candidata de superficie aislada; siguientes pasos: coste y validación de efectos reales antes de integrarla.
