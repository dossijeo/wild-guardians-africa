# Evidencia de incursiones para campañas

`createNativeRaidCampaignEvidence(initial)` es un observador QA de solo lectura. Llamar `observe(state)` después de cada avance nativo y antes/después de recargas. `report(state)` devuelve hechos por incursión y especie, presupuesto nativo inicial, contactos, fallos, golpes a trabajadores, cultivos y estructuras, escudos, HP perdido y costes de reposición diagnósticos. No altera ledger, RNG ni daño.

Si el tick que genera una incursión ya completó contactos, reconstruye el presupuesto inicial sumando únicamente consumos nativos registrados a los golpes restantes observados. Si una incursión completa sucede sin observar su cohorte, o se pierde la ventana de eventos, el informe es incompleto. No inventa actores ni presupuestos.

Las posiciones de nacimiento/salida se conservan como hechos, pero no acreditan por sí solas legalidad de entrada ni visibilidad renderizada. Los censos de plantas antes/después de la observación delimitan un intervalo; no se presentan como un censo exacto del substep de nacimiento. El valor base perdido no es una cosecha futura ni un débito del jugador. Los golpes interceptados son contactos reales con muros, no una reducción garantizada del daño.

Cuatro pruebas dirigidas pasan: ataques nativos y coste de cultivo destruido tras reload; contactos con escudo; pérdida de ventana de eventos; intercepción física con HP perdido20. Terreno plano sin props y recinto de colisión controlado: validan observación, no campañas ni geometría de los seis biomas.
