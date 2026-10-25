# Manglares: cubierta en patios usando asentamientos nativos

Seis parejas reales,semilla712,media,1280×720,misma cámara/hora, día y noche,sin errores ni overflow. Candidata lee una vez horizonSource.snapshot().settlements y deriva clear=max(19,hypot(hx,hz)),halo=clear+13 según C++. Reduce desgaste visual a8% fuera de corredores dentro del halo. No modifica máscara de terreno ni simulación.

Conserva corredor con envolvente conservadora de3.625 unidades respecto a ejes: ancho nativo máximo3.1 más warp máximo.525. Dentro conserva desgaste original; no intenta reproducir noise JS. Mantiene filtro periférico de.6,agua,ocupación ypendiente. Debe verificarse exhaustivamente con colocaciones yotros asentamientos antes de integrar.

[Comparativa día](comparison-day.jpg) y [noche](comparison-night.jpg): cubierta visible entre edificios, mayor volumen que control. Bordes demasiado rectos y contraste de hojas/musgo aún evidente. Conservar candidata para refinamiento,no promover a V10 todavía ni descartar por coste sin medir.

Triángulos de cubierta control3648/14776/5936 frente63112/101800/72136; near1090/2186/1505,far3529/3981/2997. Llamadas finales66/45/65 frente66/44/65. Segunda vista activa un batch cercano antes vacío. No tiempos GPU/CPU en este pase; no extrapolar benchmark de otras regiones. Cambia superficie rasterizada aunque los módulos sean compartidos.

Limitaciones: snapshot fijo al instalar; no refresca asentamientos nuevos. Pendientes máscara de borde suave,coherencia de pigmento,benchmark,streaming yvalidación de ocupación con eventos reales. No nuevas consultas de Engine por fotograma; CPU adicional durante creación de tiles, no medido. Objetivo global pendiente.

Reproducir capture-mangrove-native-yard-20261021.mjs y package-mangrove-native-yard-20261021.py con Vite5190. counts.json conserva contadores; PNG regenerables. Solo QA.
