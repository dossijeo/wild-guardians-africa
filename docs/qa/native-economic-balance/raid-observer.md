# Evidencia de incursiones para campañas

`createNativeRaidCampaignEvidence(initial)` es un observador QA de solo lectura. Llamar `observe(state)` después de cada avance nativo y antes/después de recargas. `report(state)` devuelve hechos por incursión y especie, presupuesto nativo inicial, contactos, fallos, golpes a trabajadores, cultivos y estructuras, escudos, HP perdido y costes de reposición diagnósticos. No altera ledger, RNG ni daño.

El evento nativo RaidSpawned incluye la cohorte y sus presupuestos iniciales, además del censo exacto de cultivos vivos y heridos en el nacimiento. El observador puede recuperar esos hechos incluso si la incursión termina entre observaciones. Para eventos anteriores sin metadatos, reconstruye únicamente consumos nativos registrados más golpes restantes; sin cohorte observada o si pierde la ventana de eventos, declara el informe incompleto.

Las posiciones de nacimiento/salida se conservan como hechos, pero no acreditan por sí solas legalidad de entrada ni visibilidad renderizada. El censo exacto se distingue de los censos de intervalo antes/después de observar. El valor base perdido no es una cosecha futura ni un débito del jugador. Los golpes interceptados son contactos reales con muros, no una reducción garantizada del daño.

Cinco pruebas dirigidas pasan: ataques nativos y coste de cultivo destruido tras reload; contactos con escudo; pérdida de ventana de eventos; intercepción física con HP perdido20; cohorte completa terminada entre observaciones con censo exacto. Terreno plano sin props y recinto de colisión controlado: validan observación, no campañas ni geometría de los seis biomas.
