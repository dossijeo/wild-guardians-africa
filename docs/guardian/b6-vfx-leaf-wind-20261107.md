# Viento de fragmentos de hoja WebGPU

Los fragmentos rígidos de hoja utilizan en GPU la misma deformación que el compositor nativo: el desplazamiento se calcula después de la transformación de instancia, en el espacio local del efecto, con intensidad 0,3 y el tiempo del propio efecto. Otros tipos de fragmento conservan su geometría. La fase llega junto a los parámetros visuales existentes y permanece ligada al tiempo de simulación confirmado; no modifica posiciones ni colisiones autoritativas.

La deformación se aplica mediante el nodo de posición compartido, también disponible para el pase de sombra. Las pruebas generan WGSL para color y sombra y comprueban que dos efectos compartan material sin compartir su tiempo. Aún faltan una comparación visual de las hojas y sus sombras en WebGPU real y la medición del coste; la simulación nativa de partículas y fragmentos sigue ejecutándose en CPU dentro del Worker gráfico.
