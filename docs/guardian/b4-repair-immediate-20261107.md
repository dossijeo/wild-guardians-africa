# Reparación confirmada y animación de trabajo

La reparación actual se completa al llegar al punto físico de servicio; no pasa por un intervalo confirmado `acting`. Si un estado heredado contiene una reparación en ese estado, el siguiente tick también la completa. El VFX confirmado de polvo procede de `RepairApplied` y conserva su ruta actual. Se añade una prueba de aceptación que observa el trayecto y verifica que la reparación llega una vez sin publicar esa fase.

La integración del banco GPU `Dig` del commit `a4ee60e11` se ha revertido: optimizaba una ruta que la reparación normal no utiliza y añadía cuatro bancos y preparación innecesarios. La presentación CPU sigue disponible para estados heredados. No se ha modificado el tiempo de reparación ni la simulación. El efecto `dig` de plantación inicial es una acción distinta y mantiene su integración existente. Las pruebas de reparación, plantación y riego pasan; esto no mide rendimiento en partida.
