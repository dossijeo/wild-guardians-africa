# Normales segun la curvatura real de la fronda

QA aislada, seis capturas reales dia/noche. Misma geometria de 32 triangulos por mata, densidad, color y camara que clumps. El normal del atlas se transforma por la tangente analitica del arco, incluyendo la escala vertical de cada instancia. Ambiente sigue orientado hacia arriba. No se sustituyen modelos ni se cambia simulacion.

La lectura de algunas caras mejora y la respuesta tiene una base geometrica coherente, pero la comparativa sigue mostrando foliolos demasiado anchos y sombras insuficientemente separadas para igualar el mockup. No se declara alcanzada la direccion artistica ni se integra esta variante. Falta incluir pendiente del suelo y deformacion de viento en esa base tangente; ahora aproxima la fronda en reposo. Sin afirmacion de coste: el benchmark paralelo temporalmente anterior corresponde a leaflight, no a esta variante.

Reproduccion: WG_CARD_TREATMENTS=cards; node tools/experiments/capture-holly-fern-relief-tangent-20261023.mjs con Vite 5190.
