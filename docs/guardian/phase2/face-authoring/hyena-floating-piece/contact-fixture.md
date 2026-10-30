# Recuperación concurrente y prórroga por contacto

El fixture de tres hienas exigía incidentalmente que alguna alcanzara el límite del giro en contacto con otra levantándose. Con el asset reparado no ocurre: las tres completan la recuperación, pero la aserción sobre demora fallaba. Se mantiene la recuperación concurrente, poses finitas, tres recuperaciones authored, ausencia de fallos y liberación del solver. Se añade la especie en userData como hace la preparación real del modelo.

La política de prórroga se prueba ahora aisladamente: pose bloqueada sin integrar movimiento, consulta de contacto controlada, con y sin vecino cinemático. Verifica que no hay prórroga sin contacto y que con contacto alcanza pero nunca rebasa el límite configurado; termina por timeout. No se presenta este ensayo como validación física de contactos reales. Los otros 37 ensayos de combate/ragdoll pasaron juntos; el nuevo ensayo corregido pasó de forma focalizada. No se modifica la lógica de producción.
