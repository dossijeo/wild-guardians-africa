# Resultado negativo: priorizar reparaciones de ruinas

AB nativo continuo en Manglares/Mapungubwe, semilla 123, 14 noches, mismo
runtime `170fc4aeaa2825e7b38b3a2006537d4c6ab6f500`. Ambos brazos usan
`DEFAULT_GENES` (`zarzas`, umbral de reparación 0,80); la única diferencia es
`defenseRepairPriority: creation` frente a `ruined-first`. El segundo ordena
primero las ruinas elegibles, conservando el orden original dentro de cada
clase. Ningún brazo modifica precios, daño, reserva, umbral ni navegación.
Los `stamp.json` conservan hashes del runner y de la política; `report.json.gz`
y `archive-index.json` permiten verificar el JSON original. Los checkpoints
proceden de la misma sesión, sin recargas, y están en
`checkpoints/snapshots.tar.gz` con hashes por miembro.

| Política | Noches | Caja final | Plantas vivas | Plantas destruidas | Ingresos | Semillas | Salarios | Muros pagados | Reparaciones | Ruinas en incursiones |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Orden histórico (`creation`) | 14/14 | 905 | 167 | 5 | 18.234 | 8.460 | 8.084 | 900 | 585 | 44 |
| `ruined-first` | 14/14 | 638 | 59 | 121 | 16.314 | 7.630 | 7.356 | 900 | 490 | 48 |

Ambas campañas concilian cada jornada con el ledger, sin derrota terminal ni
error técnico. El brazo nuevo pierde más plantas desde la noche 8 (3, 7, 6,
24, 49, 4 y 28 bajas hasta la 14). Los snapshots de inicio de día 7 muestran
en ambos 41 módulos, cuatro arruinados y cuatro dañados. En el día 8 ya
divergen las construcciones (61 frente a 60 módulos) y el RNG; las incursiones
posteriores tienen distinta atracción y composición. En el día 9, el control
tenía una ruina y 100 HP pendientes frente a seis ruinas y 774 HP pendientes
en la variante. Estas observaciones no demuestran por sí solas qué orden de
tareas se completó antes del ataque, ni que el cambio de prioridad sea la causa
única de las 116 bajas adicionales. Se requiere observar cuándo aparecen y se
cierran las brechas y cuánto tiempo quedan expuestos los cultivos.

Esta política **no pasa** el filtro corto en Manglares/123 y no justifica
escalarla a 30 noches. Se conserva como resultado negativo, sin adoptarla en
el jugador virtual predeterminado. Manglares/123 es un escenario de desarrollo
explorado repetidamente; la aptitud general requiere biomas y semillas nuevos.
