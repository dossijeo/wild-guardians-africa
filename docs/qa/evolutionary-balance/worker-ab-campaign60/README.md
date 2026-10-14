# Extensión congelada y diagnóstico del trazado defensivo

Se repitió la política candidata `DEFAULT_GENES` de la PR #36, con el mismo
Wild Engine más la corrección de rutas de trabajadores (`sourceHash`
`723ff991e2de3ed0149236ce069b33d698c958c4`), Manglares/Mapungubwe y
semilla 123, estableciendo un horizonte máximo de sesenta noches. Las treinta
primeras filas diarias, excluidos sus tiempos de pared, y las treinta
incursiones son **exactamente iguales** a la campaña independiente de treinta
noches. No hubo recargas ni cambios de genes. `evolved/stamp.json` conserva
SHA-256 del runner, parámetros y umbrales de parada. `progress.jsonl`,
`report.json.gz` (con índice SHA-256) y checkpoints comprimidos conservan la
evidencia. El informe se comprimió sin pérdida después de la corrida.

La campaña terminó por **derrota nativa en la noche 31**: treinta noches
superadas, cero plantas vivas, 220 monedas, 29 plantas destruidas en esa noche.
El motor no reportó fallo técnico y no se activó la parada por coste (180 s de
`Game.tick` por jornada o 45 minutos de pared). Las 31 filas concilian con el
ledger. Esta política no constituye una estrategia competitiva a cien noches.

En las noches 21–30 la finca sufrió 195 plantas destruidas y no construyó
nuevos muros. Sus snapshots de amanecer mantienen 90 piezas en el mismo anillo
de coordenadas `(72,-18)` a `(102,18)`, con 9–13 piezas arruinadas según el
día. El script `tools/experiments/diagnose-worker-ab-defense.mjs` reconstruye
en QA el núcleo WASM desde los snapshots 20, 25, 30 y 31 y consulta la misma
`wallPlacement` del motor. Los resultados están en `defense-day-*.json`, cada
uno con hash SHA-256 del snapshot. El trazado tiene doce slots restantes,
rechazados de forma constante: siete por árbol/roca grande, dos por agua y
tres por edificio. En el amanecer del día 20 había 744 monedas y quedaban
148 después de reservar el 80 % de la caja, antes de otros costes; no es una
explicación suficiente atribuir todos los slots pendientes a falta de fondos.

El trazado actual no distingue si esos obstáculos cierran físicamente el
perímetro para cada especie, ni se desvía alrededor de un paso animal real.
Además, `wallStroke` excluye los módulos existentes aunque estén arruinados,
por lo que comprar piezas nuevas no cierra una brecha creada por su derrumbe;
la política depende de reparaciones pagadas y ejecutadas. Los genes actuales
pueden variar material, presupuesto y umbral de reparación, pero no pueden
corregir la geometría del anillo. En la noche 31 hubo 29 plantas destruidas y
cero impactos contra muralla. Esto es compatible con animales que alcanzan
cultivos sin encontrar una barrera intacta, pero el reporte no certifica por sí
solo su ruta ni la causa del acceso. La protección efectiva exige observación
topológica durante una incursión continua; recargar un snapshot para replay
puede alterar residencia y secuencia física.

Estos datos justifican reparar primero la política legal de trazado del
jugador virtual, manteniendo intactos daños, precios y navegación física, y
congelar esa nueva versión antes de otra búsqueda genética. Manglares/123 es
ya un escenario de desarrollo, no una reserva virgen.
