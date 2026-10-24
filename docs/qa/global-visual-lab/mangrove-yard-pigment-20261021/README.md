# Manglares: pigmento de hojas más próximo al musgo

Seis parejas reales,semilla712,media,1280×720,día/noche. Control:cubierta de patio con borde gradual. Candidata cambia multiplicador pigmento RGB(.72,.78,.62)→(.84,.86,.70) yvariación por hoja .72–1.08→.84–1.04. No cambia distribución,geometría,iluminación global ni suelo.

[Comparación día](comparison-day.jpg) y [noche](comparison-night.jpg): disminuye contraste de manchas oscuras respecto al musgo,conservando volumen de hojas. Conservar candidata para benchmark. Persisten repetición ytransición del material lejano; no calidad global alcanzada.

Cámaras,horas,instancias,triángulos,buffers yllamadas iguales en las seis parejas,sin errores. Sin nuevas texturas ni muestras. No tiempos GPU/CPU medidos: cambiar constantes no permite afirmar coste exactamente igual. Pendiente coste completo de cubierta de patio,streaming,eventos de ocupación yrefresh de snapshot nativo.

Reproducir capture-mangrove-yard-pigment-20261021.mjs y package-mangrove-yard-pigment-20261021.py con Vite5190. Capturas ycontadores en captures.json. Solo QA,V10 ymain intactas.
