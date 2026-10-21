# Cielo: primer pase de profundidad cromática

Petición del usuario: elevar calidad del cielo,actualmente deslavado respecto a escena. Seis parejas reales Manglares,semilla712,media,1280×720,cámaras bajas,día/noche. Misma cubierta de patio refinada en ambas variantes.

QA modifica únicamente color visible del panorama en sky-source.js:azul gradual con altura,horizonte ligeramente cálido ytono nocturno menos gris. Conserva HDR originales,estrellas,geometría ytexturas de entorno para reflejos. No nuevos assets ni licencias externas.

[Comparación día](comparison-day.jpg):cambio demasiado sutil,horizonte aún deslavado. [Noche](comparison-night.jpg):menos pardo,más azul ymejor separación. Conservar estudio,no dar por satisfecho objetivo artístico. Próximo pase:separación de nubes ygradiente del horizonte con mayor intención,validar seis biomas ycrepúsculo antes de integración.

Sin errores de captura. No benchmark específico del shader; no nuevas muestras de textura pero sí operaciones aritméticas. Reproducir capture-sky-depth-20261021.mjs y package-sky-depth-20261021.py con Vite5190. Cambios solo por rutas QA,V10 ymain intactas.
