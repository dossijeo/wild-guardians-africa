# Despertar confirma la fuente y falla al preparar su resplandor

La selección de cámara devolvió un mijo sin tarea asignada. La autoridad admitió la vista previa y aplicó el primer Despertar. El Guardián ya tenía preparado el modelo y el ritual. La Surface confirmó el ritual y observó la fuente plant-1000000. Farm siguió avanzando. El recurso blessing-glow devolvió Cannot order uncommitted remote frame resources antes de completar la admisión. [Recibo](performance/native-ordinary-awakening-boundary-20261121.json).

El control local difirió la inicialización de la textura hasta que cerró el paquete de dibujo. Los dos casos nuevos fallaron en la fuente anterior y pasaron en el candidato, junto con las 86 pruebas de la selección. La prueba física posterior encontró otra frontera. Dawn rechazó copyFramebufferToTexture cuando la copia intentó usar una textura de intercambio del compositor ya destruida. El prototipo queda fuera de la rama mientras se resuelve la vida útil del origen de la copia.

En Three r180, initTexture actualiza la textura inmediatamente y copyFramebufferToTexture resuelve el origen desde el contexto de render actual. El siguiente ajuste debe respetar ese contexto y vincular la copia al mismo dibujo que consume el resplandor. [Código de Three](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L2353-L2442).
