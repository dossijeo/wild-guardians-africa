# Desierto: deformación acotada y gradiente corregido

Seis parejas reales, tres cámaras, día/noche, semilla 712, media, 1280×720. Original V10 a la izquierda. Cámaras, objetivo, hora, triángulos y draw calls coinciden en todas. Sin errores capturados. El resultado evita las bandas estiradas del experimento anterior, conserva calidez y detalle, pero la diferencia artística respecto al original es pequeña. No promover como mejora global; conservar código como referencia técnica.

La deformación opera en coordenadas físicas rotadas del material: desplazamiento UV (0.60 sin(0.25v), 0.40 sin(0.20u)). Sus derivadas cruzadas quedan acotadas a 0.15 y 0.08; determinante del Jacobiano entre 0.988 y 1.012. Esto limita la deformación añadida, no las irregularidades previas del terreno o del jitter. Se transforma el gradiente normal con las derivadas analíticas respetando el signo del eje B del shader existente. No constituye una reconstrucción exacta de tangentes para todas las pendientes y el jitter previo.

Con escala 0.1, las longitudes de onda son aproximadamente 251 y 314 unidades de mundo: demasiado amplias para aportar agrupación marcada dentro de la aldea. No aumentar amplitud para forzar visibilidad. El siguiente experimento debe abordar relieve mesoscópico y zonas de acumulación, conservando el normal map pequeño. El suelo distante sigue uniforme y las siluetas no cambian.

No se añaden texturas, triángulos ni pasadas; se añaden dos senos, dos cosenos y aritmética. Coste GPU no medido por contención reciente; no se atribuyen FPS ni se descarta por rendimiento. No integración en producción ni main.

Reproducir capture-desert-ripple-bounded-20261021.mjs y package-desert-ripple-bounded-20261021.py con Vite 5190. PNG regenerables, hojas JPG y metadatos publicados.
