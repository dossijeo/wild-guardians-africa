# Control negativo de gestión: seis biomas nativos

Sobre 27c6a62, seed 712 y cultura Mapungubwe, se ejecuta la política existente de reinversión intensiva durante hasta diez noches, sin ampliar la reserva salarial ni reservar mantenimiento y plantando en ráfagas. Usa dinero inicial, terreno, navegación, jornales, precios, RNG, animales, riegos, cosecha automática y entregas físicas originales. Mantiene la entrada de incursiones desde la cámara y guardado/restauración. No fuerza grupos, daño, presupuesto ni estado de derrota. La política conserva sus decisiones de magia y reparación: no representa ausencia absoluta de defensas.

Reproducir: `node tools/check_bad_management.mjs .cache/bad-management-native`. La herramienta registra cada caso y su snapshot, reconcilia ledger/cajas/siembras mediante `auditIntensiveFarm`, exige incursiones finalizadas y un único GameOver por derrota, y comprueba que las fuentes de dominio no cambien durante el ensayo. Un bioma que sobrevive se conserva como tal; no se ajustan parámetros para obligarlo a perder. El hash de la herramienta se captura al finalizar por separado.

| Bioma | Noches completadas | Resultado | Saldo | Entregas físicas | Máximo de cultivos vivos |
| --- | --- | --- | --- | --- | --- |
| Sabana | 7 | Derrota económica al amanecer | 12 | 115 | 208 |
| Gran Río | 7 | Derrota económica al amanecer | 12 | 115 | 208 |
| Manglares | 10 | Sobrevive al límite del ensayo | 34 | 137 | 239 |
| Volcanes | 7 | Derrota económica al amanecer | 12 | 115 | 208 |
| Gran Cañón | 10 | Sobrevive al límite del ensayo | 34 | 128 | 230 |
| Desierto | 10 | Derrota económica al amanecer | 25 | 68 | 151 |

La auditoría independiente de snapshots (`terminal-audit.json`) verifica sus hashes, saldo y mínimo de amanecer. En las cuatro derrotas quedan centros operativos y recursos, pero menos de las 30 monedas necesarias para contratar: el mensaje final identifica esa causa. No son incursiones atascadas ni destrucciones artificiales. La política pasa el 94,57–97,20 % del tiempo diurno sin acción disponible; ese resultado desfavorable es del control negativo, no de una política responsable ni del comportamiento de una persona.

Los seis casos terminan y pasan sus auditorías; se conservan también los dos supervivientes. Esto demuestra posibilidad de derrota con esta gestión concreta en cuatro biomas. No acredita dificultad equilibrada, todas las culturas/seeds, derrota universal de cualquier política pobre, supervivencia responsable de 100 noches, render/audio/HUD ni móvil. Las campañas responsables siguen siendo pruebas separadas y sus resultados no se deducen de este control.
