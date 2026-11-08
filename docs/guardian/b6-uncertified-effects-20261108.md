# Efectos sin reloj histórico

La reproducción histórica solo actualiza por fotograma los efectos de trabajo certificados. Cuando no había un efecto de trabajo, el coordinador admitía el intervalo aunque hubiese efectos activos de combate u otra familia; dichos efectos conservaban su fase anterior mientras el reloj de actores avanzaba. Una prueba de regresión reproduce el caso con un ataque real del planificador de VFX y también comprueba que la aparición de un efecto después de preparar invalida la admisión.

Hasta implementar la sincronización de esas familias, la presentación vuelve a los límites confirmados cuando hay efectos activos sin certificado. Esto protege el orden y evita congelar el efecto dentro de un intervalo autónomo, pero puede reducir el número de intervalos GPU durante el combate: no se considera una mejora de rendimiento. Las pruebas se ejecutan con renderer simulado; no sustituyen la validación visual integrada.
