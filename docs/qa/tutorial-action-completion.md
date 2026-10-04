# Avance de guía al completar acciones

La lectura de una instrucción básica deja de ocupar el globo cuando su acción ya está acreditada por el estado de juego. Colocar un centro pasa inmediatamente a la explicación de plantar y permite señalar Cultivar; plantar pasa a contratación; contratar pasa a trabajo; madurez/caja pasa a cosecha; entrega pagada pasa a finalización. No ejecuta acciones por el jugador ni adelanta crecimiento, cobros o tareas. El anuncio final mantiene su lectura/cierre temporizado.

La memoria registra una instrucción completada una sola vez. Recargar conserva una instrucción pendiente; si su acción ya se realizó antes de guardar, reconstruye el paso siguiente sin repetir la construcción ni el cobro. No crea nuevas pausas y conserva el mecanismo de pausa por mano accionable.

Validación de dominio: 53 pruebas dirigidas (tutorial, pausa de manos, secuencia HUD/mundo, aviso de defensas, usabilidad e idiomas). La nueva cadena utiliza un campo plano de prueba, comandos de construcción/siembra/contratación pagados, riegos y recogida/entrega automáticas del trabajador con ticks normales. Completa una caja, saldo 606, sin clics para cerrar las instrucciones de cada acción. No es una nueva prueba visual del navegador, de teléfono físico ni del ciclo de incursión. Compilación y paquete web aprobados; aceptación visual pendiente.
