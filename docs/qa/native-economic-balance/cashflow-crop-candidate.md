# Diversificación temprana de la estrategia, sin cambiar precios

El ensayo mantenido `f8542c59` termina con 73,43 % de inactividad. Los motivos
del piloto atribuyen entre 157 y 225 segundos diarios a presupuesto; no son
pausas por falta de parcelas. Cierra con 82–172 tareas pendientes. El filtro
laboral aplaza 77 evaluaciones por horario, 48 por capital corriente y 42 por
reserva de renovación; solo autoriza tres contrataciones adicionales.

Además, la política anterior compra exclusivamente mijo hasta el día 10 y
exige saldo superior a 1.000 para diversificar. Esa condición es una elección
del simulador, no una regla del juego. No debe interpretarse como prueba de
rentabilidad óptima de todos los cultivos.

Candidata explícita `--crop-policy cashflow`, conservando Q8 y defensa trazada:
primeras 30 compras de mijo; después, una posición de cada ocho puede comprar
yuca si quedan al menos 100 monedas libres además de su semilla de 12 y las
reservas efectivas de salarios, reparaciones y defensa. Si no, compra mijo.
No limita compras, trabajadores, tamaño agrícola ni producción. Conserva la
política histórica como opción predeterminada y registra la nueva en fuente
y resultado. No se cambian precios, crecimiento, riegos ni ingresos nativos.

Motivo orientativo: mijo cuesta 5 y rinde 11; yuca cuesta 12 y rinde 32.
Ambos tienen dos riegos obligatorios y recolección física. Su margen base por
ciclo es 6 y 20 respectivamente, antes de salarios, daños, magia y recorridos.
Yuca tarda 480 segundos frente a 140: existe riesgo de inmovilizar capital y
requiere validación nativa; esta comparación no predice entregas por jornada.
La proporción inicial prudente busca conservar el ingreso de ciclo corto.

Se evalúa primero durante siete noches y se conserva cualquier resultado
negativo. No se da crédito a trabajo automático como acción del jugador ni a
ingresos hasta la entrega de cajas. No se fusiona con `main`.

Corrección documental: el ensayo mantenido entregó 55 cajas el día 7, no 56.
El ingreso de 858 y el saldo de 429 ya eran correctos en el ledger y los JSON;
se corrige únicamente la celda del README que transcribía mal ese contador.
