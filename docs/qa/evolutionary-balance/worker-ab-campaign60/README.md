# Extensión congelada y diagnóstico de defensa

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

Una auditoría topológica independiente con Wild Engine comprobó que los doce
huecos rechazados del día 20 bloquean localmente al animal más pequeño. En el
día 30, once bloquean y uno resulta transitable. Por tanto, esos rechazos no
explican por sí solos la derrota. El índice espacial clasificó 124 de 129
cultivos como alcanzables desde el exterior el día 20 y 25 de 29 el día 30.
Restaurar en memoria los diez y trece módulos arruinados, respectivamente,
redujo los cultivos alcanzables a cero; los restantes se clasificaron como
sellados o `unknown` (cinco y cuatro casos). La auditoría se reproduce con
`codex/virtual-perimeter-gap-policy`/`5199a96278d880388c2dd0fedf55d6aace9a7fc8`;
es una prueba de sensibilidad topológica del snapshot, no una reparación
económica ni una reproducción completa de la incursión.

Las reparaciones sí se pagaron: 142, 67, 65 y 62 monedas en los días 19, 20,
29 y 30. Que haya ruinas en snapshots posteriores y ninguna tarea pendiente
al amanecer no demuestra un defecto de la política. Puede tratarse de daño
nocturno recurrente, material insuficiente o umbrales de reparación; falta
separar esas causas mediante observación continua y nuevos pilotos emparejados.
En la noche 31 hubo 29 plantas destruidas y cero impactos contra muralla.
El reporte no certifica por sí solo la ruta de cada animal. Los genes de
material, reserva de caja y prioridad de reparación son decisiones legales
que deben evaluarse antes de modificar el trazado o el balance. Manglares/123
es ya un escenario de desarrollo, no una reserva virgen.
