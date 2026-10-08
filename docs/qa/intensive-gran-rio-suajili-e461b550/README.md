# Gran Río / Suajili: campaña histórica de cien noches

La estrategia de reinversión responsable termina las cien noches con victoria,
seed 712, ocho especies de cultivo y hasta **1439 plantas vivas**. El proceso 49608
terminó con exit 0, sin stderr. El padre 27132 avanzó a Gran Río/Musgum sin reiniciar
este caso; ese proceso 28864 sigue siendo otro ensayo independiente.

Se inspeccionaron report/state/summary/status/process. La auditoría nativa verifica
monedas enteras, balance por entradas reales, cobro de todas las semillas, cajas
creadas por recogida física y cobro de entregas, roundtrip exacto del guardado,
victoria tras100noches/día101 sin incursión ni GameOver. La síntesis completa se
recalcula exactamente desde el informe y estado final.

Balance: 1500 iniciales + 1619218 ingresos −830542 semillas −237810 jornales
−200 reparaciones −800 centro = **551366 monedas**. Hay 23700 siembras,
22048 recogidas y22043 entregas; cinco cajas siguen en tránsito. No se introdujo
dinero sintético ni se cambiaron parámetros para aprobar el caso.

Los100días registran contratación y entregas. La política usa ancianas, cultivos
mixtos, reservas de contratación/crecimiento de plantilla y mantenimiento,
siembra repetida conforme entra dinero y uso de magias. No añade murallas ni
contratación a mediodía y no constituye prueba humana de usabilidad o control
de mala gestión.

La estrategia registra 5978 s sin acción entre 30000 s diurnos (**19,93%**): 3979 s
por presupuesto y 1999 s por fin de turno. Máximo128s seguidos, P90 53 s. El indicador
no cuenta todas las acciones posibles de interfaz ni mide aburrimiento humano;
El usuario aprobó explícitamente esta métrica el 8 de octubre de 2026: menos
del 20% de tiempo sin acciones se considera aceptable. Este caso cumple el
criterio; no queda pendiente reducir su inactividad. La aceptación corresponde
a esta medición histórica y no sustituye la validación de otras campañas.

Las 291 huellas de fuentes del hijo coinciden con la matriz padre y con los archivos
congelados de **e461b550**. Su HEAD ambiental c10f7731 corresponde al repositorio
exterior al arrancar y no a las fuentes cargadas. La auditoría se realizó con
main cdb822f5; 27 fuentes inspeccionadas difieren, enumeradas en receipt.json.
Este resultado **no valida main actual**, la reparación de rutas posterior,
las 30 combinaciones bioma/cultura, el rendimiento GPU o móvil.

Los cinco archivos completos están comprimidos y vinculados por SHA256/raw+gzip
en receipt.json. Ejecutar
`node docs/qa/intensive-gran-rio-suajili-e461b550/verify.mjs`
repite la auditoría nativa, integridad y síntesis; no vuelve a simular 100 noches
ni prueba por sí mismo el inventario histórico completo de fuentes.
