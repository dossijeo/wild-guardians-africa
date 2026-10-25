# Desierto: atenuación anticipada del relieve

Seis parejas reales, semilla 712, media, 1280×720, tres cámaras, día/noche. Izquierda candidata mesoscópica anterior (.6–2 unidades por píxel), derecha misma candidata con atenuación .25–1.2. No es una comparación con terreno original. Solo cambia ese intervalo; amplitudes, frecuencias, normal map, color y geometría son idénticos.

Cámaras, objetivos, horas, triángulos y draw calls coinciden en seis parejas. Sin errores capturados. Revisión visual de hojas día/noche: conserva acumulaciones cercanas, reduce la apariencia arrugada del fondo y deja dominar mejor las dunas grandes. Preferir esta variante para las siguientes pruebas. El cambio es moderado y no soluciona por sí solo todas las limitaciones del material.

No añade instrucciones respecto a la candidata previa salvo distintas constantes; ambas siguen calculando ruido y gradientes antes de atenuar. No atribuir ahorro GPU a reducir su visibilidad. No hay benchmark nuevo. Pendientes transición en movimiento, streaming/origen flotante y coste sin carga externa. No integración por defecto, main intacta.

Reproducir capture-desert-meso-filter-20261021.mjs y package-desert-meso-filter-20261021.py con Vite 5190. Capturas PNG regenerables; hojas, metadatos y auditoría publicados.
