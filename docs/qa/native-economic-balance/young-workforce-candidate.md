# Capacidad laboral: comparación joven/mayor

Comparación explícita de una decisión disponible al jugador: cambiar
`--profile olderFemale` por `--profile youngFemale`. Se conserva Q8 con seis
trabajadores iniciales pagados, cultivos históricos, mismos criterios de
contratación adicional, salarios reservados y defensa trazada con mantenimiento
desde el día 6. No se cambia crecimiento, FIFO, animación, recorrido ni daño.

Las mayores cobran 30; las jóvenes 40 y usan la velocidad nativa 1,5. La razón
nominal velocidad/jornal mejora un 12,5 %, pero eso no predice producción ni
beneficio: hay crecimiento, riego, rutas y esperas. Además, el primer contrato
cuesta 240 en vez de 180 y su renovación inmoviliza más capital. El resultado
debe observarse en entregas y pagos reales.

La CLI valida los cuatro perfiles nativos y conserva `olderFemale` por defecto.
Opciones, procedencia, `protocol.json` y protocolo del resultado identifican
el perfil efectivo; no deben anunciar el perfil histórico al medir otro.
Pruebas verifican seis empleados nativos, pago 240, renovación 240, filtros
originales y rechazo de perfiles ficticios. No se han dado trabajadores gratis.

Primera prueba: siete noches, semilla 712, Sabana/Mapungubwe. Si hay un
desequilibrio claro se usa parada cooperativa con evidencias parciales, sin
clasificarlo como derrota ni modificar parámetros durante la campaña.
No se inicia la matriz de cien noches ni se integra en `main` desde una
comparación aislada de capacidad.
