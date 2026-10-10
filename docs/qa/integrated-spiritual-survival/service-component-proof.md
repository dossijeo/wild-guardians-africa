# Auditoría del certificado de perímetros del simulador

La comprobación por caja completa puede ser demasiado conservadora en contornos de orilla: incluye posiciones ajenas a las plantas/centros y fuera del recinto. El nuevo refinamiento consulta las 32 posiciones de aproximación nativas de cada cultivo vivo y cada centro para cada radio de especie. Solo acepta posiciones bloqueadas por colisión o conectadas físicamente a componentes nativos positivamente cerrados cuyos nodos están dentro del contorno.

Un resultado nulo de A* acotado no certifica un cierre. Una posición fraccional sin ninguno de los nueve conectores nativos tampoco se acepta automáticamente: necesita una conexión física positiva a un componente cerrado, buscada en el entorno de tres celdas. Si no la tiene, el resultado permanece `native-service-origin-unproven`.

Las cuatro pruebas nuevas comprueban componentes positivos, componentes que salen del polígono, búsqueda acotada sin certificado, rutas abiertas directas y con rodeo, y orígenes fraccionales vacíos. Junto a las políticas de defensa y cachés fallidas pasan 18 pruebas.

Los diagnósticos anteriores `canyon-service-proof-diagnostic-v1/v2/v3.json` se conservan como exploratorios bajo la antigua regla que permitía cruzar el río a animales. El v3 aceptaba un origen vacío, criterio que esta revisión rechaza. Ninguna de esas propuestas fue pagada ni acreditada como protección de una campaña.

El diagnóstico nuevo `canyon-river-service-proof-strict-v1.json`, con el río como barrera hostil, tampoco certifica los nueve candidatos: la pose de `plant-1668` no dispone de certificado positivo. No se rebaja ese resultado a una victoria ni se fabrica interceptación. Debe resolverse la política de diseño/pago de defensas antes de aceptar el piloto protegido del cañón.

Las campañas históricas v6 se archivan completas. Sus cuatro estrategias de Sabana producen exactamente los mismos resultados diarios y finales que v5; no hay una nueva mejora económica atribuible a la distancia preferida del agua. El piloto del cañón terminó por parada cooperativa de calibración, no por derrota. El dinero final de Sabana es 563 (buena), 610 (expansiva), 213 (pasiva), 748 (sin defensas). Todas concilian el ledger. Son siete noches, cinco introductorias: no aprueban supervivencia a 100 noches ni inactividad humana inferior al 25 %.
