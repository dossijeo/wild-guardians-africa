# Recorte del corredor de llegada de Farm

Al replanificar Farm alrededor de la huella de una ruina reparada, el planificador nativo devolvió un rodeo de 14 puntos. La etapa que recorta la llegada lo rechazó como `unknown`. El tramo entre (-16, 11) y (-16, 10) quedaba lejos del círculo de servicio centrado en (-14, 3,2), con radio 2. Su recta era tangente al círculo y activaba la comprobación conservadora de tangencias aunque el tramo no pudiera alcanzarlo.

`gateCircleRange` descarta primero los casos en que las proyecciones del círculo y el tramo sobre su eje están separadas por más del margen existente. Las tangencias cercanas conservan el resultado indeterminado. Box2D limita el impacto de un rayo con un círculo a la fracción solicitada y Godot limita las raíces de la intersección al tramo. [Box2D 3.1.1](https://github.com/erincatto/box2d/blob/v3.1.1/src/geometry.c#L472-L537), [Godot 4.4](https://github.com/godotengine/godot/blob/4.4-stable/core/math/geometry_2d.h#L206-L236).

El control compila la función de producción a WASM. De 42 comprobaciones, 12 fallaban con la versión anterior y todas pasan con la corrección. Incluye ambos sentidos del rodeo, tangencias cercanas y en los extremos, el margen axial y las raíces de un cruce real. Se recompilaron los dos binarios canónicos con las mismas opciones y se verificaron las importaciones, las exportaciones y las versiones de la interfaz. El módulo JavaScript de pthread coincide byte a byte. Pasaron las 830 pruebas de regresión seleccionadas de Farm, navegación nativa, portones y mutaciones de estructuras.

Esta comprobación cubre el recorte geométrico. La adquisición Stop24, Repair y la continuación de Farm se validan como cadena por separado. El presupuesto de cadencia C4 sigue abierto.
