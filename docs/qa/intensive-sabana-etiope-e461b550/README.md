# Sabana / Etíope: cien noches de cultivo intensivo

El hijo PID 43808 terminó con exit 0 y victoria tras completar 100 noches. Es el quinto caso terminado de la matriz congelada de treinta combinaciones. El proceso avanzó a Gran Río/Mapungubwe, PID 20024, confirmado vivo; no se reinició la campaña.

Los 291 hashes cargados coinciden con el manifiesto del padre, la copia congelada y el caso Musgum previamente archivado. Revisión cargada e461b5502212fd6116e0cf37d270a2836134438a, indicada por frozen-source.json. El HEAD ambiental del hijo fue 67907fbd6498dfc91807b3afb67596f1d03e6619, porque Git ve el repositorio superior; no es la revisión ejecutada. Se conservan ambas procedencias.

Seed 712, ocho especies, trabajadoras mayores remuneradas, reserva de contratación/mantenimiento, rutas e incursiones nativas. Sin murallas ni contratación adicional. Máximo 1440 plantas vivas y saldo final 535741. El resumen recalculado reconcilia exactamente: 1500 iniciales + 1617743 cosechas − 838292 semillas − 244230 salarios − 180 reparaciones − 800 centro = 535741.

La estrategia registra 5597 de 30000 segundos diurnos sin acciones (18,6567%): 3620 por presupuesto y 1977 tras terminar turnos. Intervalo máximo 128s, percentil90 de59s. Esa inactividad sigue pendiente de reducir; no mide aburrimiento físico ni frametime.

En main 4e1ac82d se deserializó el estado completo y el resumen recalculado coincide exactamente con el archivo. Hay 23 entradas de fuentes registradas diferentes en main; la comparación no enumera nuevos archivos ajenos al manifiesto congelado. La auditoría de integridad e invariantes actuales no vuelve a simular cien noches del runtime actual, ni valida toda la matriz, móvil, render, audio o decisiones malas.

Se archivan los cinco JSON terminales y la procedencia de la copia congelada, conservando bytes y hashes raw/gzip. El heartbeat final refleja la última observación antes de terminar; process, report y state terminales acreditan el resultado final.

```powershell
node docs/qa/intensive-sabana-etiope-e461b550/verify.mjs
```
