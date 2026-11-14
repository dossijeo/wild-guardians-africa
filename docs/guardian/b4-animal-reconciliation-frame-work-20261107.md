# Seguimiento de reconciliaciones de bestias

El roster registra las bestias que realmente están reconciliando una pose visual y visita solo ese conjunto durante el fotograma. Una bestia con impacto provisional sigue actualizándose mientras dura ese efecto; si también está reconciliando, se actualiza una sola vez. El registro se actualiza al cambiar la pose y se vacía al retirar el actor o cerrar el roster. Las posiciones y contactos autoritativos permanecen en Wild Engine.

Una prueba con doce actores verifica que cuatro fotogramas sin reconciliaciones no consultan ni actualizan individualmente sus poses; también cubre inicio, fin y retirada. Las pruebas existentes de poses físicas y presentación siguen pasando. Esto elimina el recorrido JavaScript del roster para localizar reconciliaciones, pero el banco de recursos y el renderizador siguen ejecutándose por fotograma. No se han medido tiempos de CPU, GPU ni fotogramas en una incursión real.
