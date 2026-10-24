# Superficie de agua irregular — candidato QA

La superficie procedural existente cubre correctamente charcas y ríos; [diagnóstico de ruta](../water-route-audit/README.md). Se conservan sus geometrías, recortes y orillas. El candidato sustituye las normales sinusoidales grandes por pendientes analíticas irregulares de dos escalas, reduce las bandas pintadas y usa una reflexión HDR más definida. La animación utiliza el reloj y coordenadas globales existentes. No modifica física ni navegación.

48 capturas en seis biomas: cámara normal y baja, día/noche, semilla 712 y calidad media. Las 24 parejas coinciden en cámara/hora y no añaden draws, triángulos o texturas. Desierto coincide exactamente; Volcanes no cambia perceptualmente salvo 0,00076 % de píxeles de la vista de juego nocturna. La lava se excluye explícitamente del parche. No atribuir esa diferencia aislada a una mejora.

La lectura de Sabana, Gran Río y Cañón mejora frente a las franjas anchas originales. Manglares gana reflejos, aunque todavía no reproduce la mezcla de lodo, raíces y orillas del mockup. Un corte del agua en el Cañón es visible también en la referencia. No se considera resuelto ni causado por esta variante.

`motion/` contiene 32 capturas adicionales sobre cuerpos de agua, cuatro biomas, día/noche y reloj de shader 0/2 s. Se cambia únicamente el reloj de animación visual dentro de cada fase. Son dos instantes, no una prueba continua de estabilidad temporal o de distancia extrema. Las capturas de noche conservan lectura del agua, pero no demuestran calidad final nocturna.

Pendientes: coste GPU de vistas con amplia cobertura de agua, reducción de coste si supera presupuesto, estabilidad al recentrar origen y carga de nuevos chunks. La aplicación QA afecta solo a los materiales residentes y no está integrada en el juego. No activar por defecto.

La [medición GPU](PERFORMANCE.md) impide adoptar esta versión: +1,418 ms diurnos en Sabana, +1,069 ms nocturnos en Manglares y +0,776 ms nocturnos en Cañón. Mantener la dirección visual, pero reducir el coste antes de integrarla. Un 404 de primera carga sin URL identificada aparece en algunos logs; no hubo errores JS/shader registrados.
