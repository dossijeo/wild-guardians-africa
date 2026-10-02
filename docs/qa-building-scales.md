# Revisión de escala de centros y poblados

Solicitud del usuario, 2 de octubre de 2026: comparar las cinco culturas y
usar las dimensiones coherentes de las casas de trabajo como referencia.

`node tools/audit_building_scales.mjs` mide los cinco GLB originales, aplica
los parches geométricos del lab DEST y registra hashes, huellas y dimensiones
en `content/manifests/building-scale-audit.json`. El lab DEST conserva las
coordenadas y solo centra rígidamente la casa; no la reduce a un radio común.
El lab Poblados V5 y la integración usan escala 16 para sus unidades.

| Cultura | Altura original | Altura antes de corregir | Factor anterior |
| --- | ---: | ---: | ---: |
| Mapungubwe | 3 | 1,692 | 0,564 |
| Suajili | 8 | 3,923 | 0,490 |
| Etíope | 8 | 4,175 | 0,522 |
| Saheliana | 9 | 3,408 | 0,379 |
| Musgum | 7 | 3,166 | 0,452 |

Son unidades del mundo, sin afirmar una medición física independiente en
metros. Mapungubwe tiene casas del poblado de 3,06 a 4,84 de altura: el centro
reducido llega aproximadamente a la altura del trabajador nativo de 1,7.
Recuperar altura 3 corrige esa diferencia. Las otras casas de trabajo también
están reducidas por `prepareNativeBuilding`: `scale:2.6/radius`.

La corrección debe conservar escala 1 en los centros y utilizar su
huella nativa en navegación, colocación, impactos y puntos de servicio. No
basta cambiar el render: Navigation y la preparación inicial usan radio 2,6,
la llegada está en x+3,4, la entrega en x+3,2 y la reparación en un anillo de
radio 3,2. Esos puntos pueden quedar dentro de la casa original ampliada.
También hay que comprobar las partidas anteriores y la cultura del poblado
al que pertenece cada centro, las propuestas de colocación y las rutas
poblado–centro–cultivo. La escala del poblado se comparará visualmente después
de restaurar los centros; no se deduce un factor nuevo arbitrario por cultura.

La tabla anterior registra el defecto antes de la corrección (commit
`d232e70`). La calibración independiente de huellas ya está publicada en
`24f62c6`; la integración posterior restaura escala 1 en las cinco culturas.
La auditoría regenerada con el código corregido confirma escala 1 y alturas
3/8/8/9/7 para Mapungubwe/Suajili/Etíope/Saheliana/Musgum; el manifiesto
registra ahora esas dimensiones actuales. La tabla conserva la comparación
histórica que permite identificar la reducción anterior.

## Corrección y evidencia

Los centros usan escala 1 y una huella convexa derivada de los GLB originales
con el centrado y los parches de DEST. La colocación valida esa huella, los
cultivos vivos y los módulos de muro completos. La cultura física queda
guardada en el centro y no cambia al modificar su asociación logística.
Llegada y entrega se sitúan fuera de la cara de la casa; reparación e incursión
comprueban sus rutas contra la misma geometría. Los hechos de impacto nuevos
conservan cultura y giro; los antiguos consultan el centro conservado.

La búsqueda inicial exige doce parcelas próximas accesibles en ambos sentidos
con los obstáculos reales del centro y del poblado. Las fixtures de puertas,
cajas, tutorial y reparación sitúan sus actores fuera de la casa ampliada.
La prueba histórica de retirada conserva la ubicación exacta del poblado que
originó el fallo, con un centro nativo comprado en otro sitio legal; cambiar
la búsqueda inicial no debe borrar esa regresión.

Se inspeccionaron las cinco culturas en Sabana/712, con el shader African Toon,
terreno y poblados originales. Capturas `test-results/native-center-*.png`:
Mapungubwe, Suajili, Musgum, Saheliana y Etíope. No se aplicó un factor nuevo a
los poblados: se conserva su escala 16. La consola consultada no tenía errores
ni avisos. Esto no acredita todas las pendientes ni todas las partidas antiguas
con cultivos o trabajadores dentro de la huella ampliada.

Las cinco pruebas nuevas comparan hashes/huellas/bounds de los GLB, contactos
girados, colocación sin cobro ante solapamientos, llegada y reparación
exteriores, cultivo/cosecha/entrega pagados y persistencia de cultura. Las
pruebas de material, navegación y controladores también se repiten. La
calibración de cinco trayectos originales recupera una mediana de 35,268031
unidades y una reserva de tres trayectos: 105,804094. Las velocidades extraídas
de los labs permanecen en 0,72/1,6; la reserva anterior era 95,964915.

Las dos campañas de cien noches se mantienen con contratación explícita de
mujer mayor y reparación solicitada por debajo de 540 PV. Se conservan pagos,
costes, tiempos, probabilidades, derrotas y exigencia de entregas diarias de
las pruebas; solo cambia la estrategia del diagnóstico. La antigua estrategia
de hombre mayor resulta derrotada en la noche 8 con esta escala. Con mujer
mayor y reparación tardía a 300 PV, la campaña de girasol gana pero registra un
día sin entregas al recuperarse de perder un centro; la de ocho cultivos pasa
todas las aserciones. Reparación temprana permite que ambas pasen.

La regresión integrada pasa 487/487 pruebas, sin omisiones, en 332,365 s
(`test-results/tests-native-center-complete.txt`). Los cambios finales de
colocación pasan 42/42 pruebas dirigidas; los impactos y la compatibilidad de
hechos antiguos pasan 9/9, incluida una prueba nueva posterior a la regresión.
La suite de esta revisión pasa 488/488 pruebas en GitHub Actions sobre
`55678cd` ([ejecución 37007500926](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37007500926)). Build final aprobado; paquete web
validado con 546 archivos, 789 enlaces relativos y 20 GLB de runtime, sin
duplicados originales. No se da por terminada la implementación del Plan Maestro.

Capturas de las cinco culturas:

- [Mapungubwe](../test-results/native-center-mapungubwe.png)
- [Suajili](../test-results/native-center-suajili.png)
- [Musgum](../test-results/native-center-musgum.png)
- [Saheliana](../test-results/native-center-saheliana.png)
- [Etíope](../test-results/native-center-etiope.png)
