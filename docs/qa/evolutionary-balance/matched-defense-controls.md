# Controles emparejados de defensa

`evaluateOne(scenario, days, strategy, frozenGenes)` acepta tres nombres de diagnóstico:

| Estrategia | Construir/reparar murallas | Escudo |
|---|---|---|
| `matched-walls-current-magic` | Sí | Sí |
| `matched-no-walls-current-magic` | No | Sí |
| `matched-no-defense-current-magic` | No | No |

Los tres requieren el mismo objeto de genes congelados. Ejecutan la misma política evolutiva de contratación, reserva, siembra, reinversión y magia agrícola con las reglas actuales; sólo varían los dos permisos de la tabla. La reparación ordinaria de centros sigue activa en los brazos sin murallas. Las diferencias de daño e ingresos después de la primera incursión pueden cambiar las acciones efectivamente disponibles: el emparejamiento mantiene la **regla de decisión**, no fuerza estados futuros idénticos.

El smoke local de dos días en Sabana 712 verificó gastos de muros 30/0/0 monedas y activaciones de Escudo 1/2/0. Los tres brazos tuvieron la misma contratación, gasto en semillas y siembra iniciales, y 113 comandos agrícolas en esos dos días. Fue una prueba corta de interfaz, no una campaña de evaluación. Los controles no modifican genes, motor, balance ni el valor predeterminado de `simulateNativeCampaign`.
