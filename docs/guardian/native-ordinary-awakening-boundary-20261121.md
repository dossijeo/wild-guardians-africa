# Despertar mantiene la captura dentro del dibujo

## Reproducción anterior

La selección de cámara devolvió un mijo sin tarea asignada. La autoridad admitió la vista previa y aplicó el primer Despertar. El Guardián ya tenía preparado el modelo y el ritual. La Surface confirmó el ritual y observó la fuente plant-1000000. Farm siguió avanzando. El recurso blessing-glow devolvió Cannot order uncommitted remote frame resources antes de completar la admisión. [Recibo](performance/native-ordinary-awakening-boundary-20261121.json).

El control local difirió la inicialización de la textura hasta que cerró el paquete de dibujo. Los dos casos nuevos fallaron en la fuente anterior y pasaron en el candidato, junto con las 86 pruebas de la selección. La prueba física posterior encontró otra frontera. Dawn rechazó copyFramebufferToTexture cuando la copia intentó usar una textura de intercambio del compositor ya destruida. El prototipo queda fuera de la rama mientras se resuelve la vida útil del origen de la copia.

En Three r180, initTexture actualiza la textura inmediatamente y copyFramebufferToTexture resuelve el origen desde el contexto de render actual. El siguiente ajuste debe respetar ese contexto y vincular la copia al mismo dibujo que consume el resplandor. [Código de Three](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js#L2353-L2442).

## Despertar sobre un cultivo asignado

En un candidato privado, Water de `olderFemale` inició Despertar durante Action15. La autoridad confirmó el relevo a Idle20 en la orden 340. En NVIDIA, el ticket 10 conservó el cuerpo 1, la raíz 705 y las 33 geometrías del trabajador. Se retiraron las seis mallas de la regadera. El primer dibujo llegó a los 33,2 ms a 30 Hz. Al reanudar el reloj, la escena devolvió otra vez `Cannot order uncommitted remote frame resources` desde `blessing-glow`. El candidato de relevo sigue en validación mientras se corrige esa frontera de la escena. [Recibo del cultivo asignado](performance/native-ordinary-awakening-boundary-20261121.json).

## Captura preparada y validación

La textura de captura se prepara después de cerrar el paquete. Al compilar el material, un nodo de textura regular evita la copia implícita del framebuffer. El callback de la malla captura únicamente durante el render síncrono del efecto y la composición consume esa misma textura en el dibujo. Se conserva una textura por tamaño y se retira tras el trabajo en cola. Three r180 ejecuta los nodos `updateBefore` durante la compilación y actualiza la proyección de la cámara en el primer dibujo WebGPU. El pase usa la cámara ortográfica de pantalla completa que emplea `QuadMesh`, conservando la misma instancia entre compilación y render. [Renderer de Three](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Renderer.js), [ViewportTextureNode](https://github.com/mrdoob/three.js/blob/r180/src/nodes/display/ViewportTextureNode.js), [QuadMesh](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/QuadMesh.js).

La selección de cámara aplicó Despertar a `plant-1000000`. NVIDIA Turing dibujó el ritual, las partículas y el resplandor mientras Farm conservaba el cuerpo 1, la raíz 682 y 32 geometrías. La orden duplicada dejó una sola fuente. Se observaron hasta 34,6 ms entre dibujos a 30 Hz y el cierre drenó. En el candidato Water → Idle20, la instrumentación confirmó cuatro capturas dentro del dibujo y 77 dibujos posteriores al relevo, con cero errores de GPU. Las 11 pruebas del resplandor cubren admisión, orden, cámara, redimensionado y retirada. C4 a 60 Hz sigue abierto. [Recibos positivos](performance/native-ordinary-awakening-boundary-20261121.json).
