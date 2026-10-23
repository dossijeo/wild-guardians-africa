# Fade continuo independiente del centro de buffers

El desvanecimiento de profundidad sigue la posicion real de camara; el buffer conserva centro en rejilla8m. La region de candidatos aumenta6m para cubrir el desplazamiento maximo del centro (sqrt(4^2+4^2)=5.657m). Solo se cambia la representacion de sombras, no la cobertura visible.

Prueba del mismo salto izquierdo/derecho desde la misma camara:0pixeles diferentes dia y noche, sin errores GL. El centro de buffer ya no modifica la imagen en esta frontera. No equivale a verificar todos los bordes, relieves o streaming.

Coste arquitectonico reconocido: el uniform de fade depende de camara y esta correctamente incluido en el contrato de cache. Mover camara invalida la sombra; no atribuir el ahorro de cache del prototipo residente a esta variante. Se conserva como control de continuidad visual. Sin benchmark de esta variante ni promocion a produccion.

Reproduccion: Vite5190; WG_CARD_TREATMENTS=cards; node tools/experiments/probe-holly-fern-shadow-camera-boundary-20261023.mjs. Capturas reales1280x720,semilla712,calidad media,impostores/fondo presentes,simulacion pausada.
