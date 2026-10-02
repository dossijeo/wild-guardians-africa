# Revisión de escala de centros y poblados

Solicitud del usuario, 2 de octubre de 2026: comparar las cinco culturas y
usar las dimensiones coherentes de las casas de trabajo como referencia.

`node tools/audit_building_scales.mjs` mide los cinco GLB originales, aplica
los parches geométricos del lab DEST y registra hashes, huellas y dimensiones
en `content/manifests/building-scale-audit.json`. El lab DEST conserva las
coordenadas y solo centra rígidamente la casa; no la reduce a un radio común.
El lab Poblados V5 y la integración usan escala 16 para sus unidades.

| Cultura | Altura original | Altura actual del centro | Factor actual |
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

La corrección pendiente debe conservar escala 1 en los centros y utilizar su
huella nativa en navegación, colocación, impactos y puntos de servicio. No
basta cambiar el render: Navigation y la preparación inicial usan radio 2,6,
la llegada está en x+3,4, la entrega en x+3,2 y la reparación en un anillo de
radio 3,2. Esos puntos pueden quedar dentro de la casa original ampliada.
También hay que comprobar las partidas anteriores y la cultura del poblado
al que pertenece cada centro, las propuestas de colocación y las rutas
poblado–centro–cultivo. La escala del poblado se comparará visualmente después
de restaurar los centros; no se deduce un factor nuevo arbitrario por cultura.

Esta auditoría identifica y cuantifica el defecto; todavía no acredita que
esté corregido ni sustituye la revisión visual de las cinco culturas.
