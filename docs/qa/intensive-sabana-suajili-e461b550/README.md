# Sabana / Suajili: cien noches de cultivo intensivo

El hijo PID 27148 terminó con exit 0, victoria y 100 noches completadas. El padre 27132 avanzó a Sabana/Musgum (PID 44164). Es el tercer caso terminado de la matriz congelada de treinta combinaciones; no prueba los veintisiete restantes ni reproduce los cambios posteriores de main.

Los 291 hashes del hijo coinciden exactamente con el manifiesto del padre y los archivos de .cache/qa-current-e461b550. Revisión cargada e461b5502212fd6116e0cf37d270a2836134438a. El hijo registró HEAD ambiental e65599c1 al iniciar: Git encontró el repo superior al directorio copiado; no es la revisión cargada. Se conservan ambas procedencias sin reescribirlas, como en los otros dos casos de esta matriz.

Seed 712, Node 20.11.0, ocho cultivos, trabajadoras mayores remuneradas, reservas para contratación del día siguiente y mantenimiento, terreno/navegación nativos e incursiones con entrada de cámara. Sin murallas ni contratación a mediodía. Máximo 1.460 plantas vivas; saldo final 560.981. Cuentas exactas: 1.500 iniciales + 1.628.832 cosechas − 831.591 semillas − 236.760 salarios − 200 reparaciones − 800 centro = 560.981.

La estrategia deja 5.977 de 30.000 segundos diurnos sin acciones (19,92%): 3.979 por presupuesto y 1.998 tras acabar turnos. Intervalo máximo 128 s, percentil 90 de 53 s. Sigue siendo un asunto pendiente de diseño/optimización, no una medida física de aburrimiento ni un resultado de frametime. No se modifica la política para hacer pasar esta corrida.

En main f594c4e2 se deserializó y auditó el estado completo, y el resumen recalculado coincide exactamente con el original. receipt.json detalla 22 fuentes distintas respecto a la copia congelada: incluye navegación, colocación de fluidos e incursiones. Esto comprueba integridad e invariantes actuales sobre un archivo histórico, no vuelve a ejecutar cien noches en main actual.

State/report/summary/status/process comprimidos conservan los bytes originales y hashes raw/gzip. `node docs/qa/intensive-sabana-suajili-e461b550/verify.mjs` vuelve a comprobar integridad, resultado terminal y resumen completo con los auditores de main. No acredita trabajadores renderizados, móvil físico, audio perceptual, mala gestión, rendimiento GPU ni todas las combinaciones. Gran Cañón sigue en su proceso independiente 49032 y no se reinició.
