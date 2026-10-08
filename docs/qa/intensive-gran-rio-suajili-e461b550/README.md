# Gran RÃ­o / Suajili: campaÃ±a histÃ³rica de cien noches

La estrategia de reinversiÃ³n responsable termina las cien noches con victoria,
seed 712, ocho especies de cultivo y hasta **1439 plantas vivas**. El proceso 49608
terminÃ³ con exit 0, sin stderr. El padre 27132 avanzÃ³ a Gran RÃ­o/Musgum sin reiniciar
este caso; ese proceso 28864 sigue siendo otro ensayo independiente.

Se inspeccionaron report/state/summary/status/process. La auditorÃ­a nativa verifica
monedas enteras, balance por entradas reales, cobro de todas las semillas, cajas
creadas por recogida fÃ­sica y cobro de entregas, roundtrip exacto del guardado,
victoria tras100noches/dÃ­a101 sin incursiÃ³n ni GameOver. La sÃ­ntesis completa se
recalcula exactamente desde el informe y estado final.

Balance: 1500 iniciales + 1619218 ingresos âˆ’830542 semillas âˆ’237810 jornales
âˆ’200 reparaciones âˆ’800 centro = **551366 monedas**. Hay 23700 siembras,
22048 recogidas y22043 entregas; cinco cajas siguen en trÃ¡nsito. No se introdujo
dinero sintÃ©tico ni se cambiaron parÃ¡metros para aprobar el caso.

Los100dÃ­as registran contrataciÃ³n y entregas. La polÃ­tica usa ancianas, cultivos
mixtos, reservas de contrataciÃ³n/crecimiento de plantilla y mantenimiento,
siembra repetida conforme entra dinero y uso de magias. No aÃ±ade murallas ni
contrataciÃ³n a mediodÃ­a y no constituye prueba humana de usabilidad o control
de mala gestiÃ³n.

La estrategia registra 5978 s sin acciÃ³n entre 30000 s diurnos (**19,93%**): 3979 s
por presupuesto y 1999 s por fin de turno. MÃ¡ximo128s seguidos, P90 53 s. El indicador
no cuenta todas las acciones posibles de interfaz ni mide aburrimiento humano;
conserva un problema pendiente de actividad/inactividad para investigar con
polÃ­ticas y parÃ¡metros actuales, sin debilitar el test.

Las 291 huellas de fuentes del hijo coinciden con la matriz padre y con los archivos
congelados de **e461b550**. Su HEAD ambiental c10f7731 corresponde al repositorio
exterior al arrancar y no a las fuentes cargadas. La auditorÃ­a se realizÃ³ con
main cdb822f5; 27 fuentes inspeccionadas difieren, enumeradas en receipt.json.
Este resultado **no valida main actual**, la reparaciÃ³n de rutas posterior,
las 30 combinaciones bioma/cultura, el rendimiento GPU o mÃ³vil.

Los cinco archivos completos estÃ¡n comprimidos y vinculados por SHA256/raw+gzip
en receipt.json. Ejecutar
`node docs/qa/intensive-gran-rio-suajili-e461b550/verify.mjs`
repite la auditorÃ­a nativa, integridad y sÃ­ntesis; no vuelve a simular 100 noches
ni prueba por sÃ­ mismo el inventario histÃ³rico completo de fuentes.
