# Exclusividad de conjuntos defensivos

## Actualización en la rama de equilibrio — 10 de octubre de 2026

La exclusividad por conjunto descrita debajo es evidencia histórica, no la
regla vigente en `codex/survival-expansion-balance`. Desde `24cb0cfd`, los
grupos conectados conservan su valoración, prioridad y comprobación compartida
de accesibilidad; **no se reservan**. Después de elegir un grupo accesible,
cada animal reserva únicamente una planta o pieza de muralla concreta.
Los centros permiten aproximaciones simultáneas físicamente separadas.

La accesibilidad compartida puede descartar un grupo mediante un certificado
completo del componente nativo de navegación. Si no existe ese certificado,
se conserva la búsqueda normal de rutas. La ruta final y la separación física
del puesto de ataque siguen comprobándose para el objetivo y animal elegidos;
eso no convierte al grupo en una reserva exclusiva ni exige sustituir su
análisis compartido por una auditoría individual de todas sus plantas.

Verificación repetida tras esta aclaración: `node --test
tests/raid-individual-reservations.test.js`, **11/11 aprobadas**. Incluye cien
mijos conectados con 1, 2, 5 y 12 animales, ataques simultáneos contra piezas
independientes de un perímetro cerrado, invalidación de accesibilidad al abrir
murallas, recarga determinista, destrucción del objetivo y espera acotada.
No se han cambiado cantidades de animales, presupuestos de golpes ni daño.
La integración en `main` continúa pendiente de la validación del equilibrio.

## Evidencia histórica anterior

Corrección `f51ea33` de la desviación registrada en
[la auditoría diurna](qa-daytime-raids.md), sección 13.7 del plan, QA-096.

Los conjuntos se calculan con los endpoints originales de Bastion, incluyendo
escala de puerta y escala de cada pieza. Uniones de extremos, cruces y uniones
en T utilizan el EPS de 0,10 m del grafo original. Las piezas intactas conectadas
comparten un objetivo; piezas separadas y componentes que se dividen al perder
un enlace siguen siendo objetivos distintos. Se suma su coste original y se
compara con el valor de los centros. Dentro del conjunto se busca un tramo
cercano alcanzable; para abrir paso hacia cultivos se mantiene la prioridad de
proximidad, sin buscar omniscientemente el material más débil.

Una reserva pertenece al conjunto completo. Cambiar su raíz al destruir una
pieza actualiza la reserva del propietario vivo. Las reservas antiguas por
pieza se adaptan y las que compiten por el mismo conjunto se resuelven siguiendo
el orden estable de animales: el excedente busca otro objetivo o se retira,
sin gastar un golpe ni moverlo artificialmente. Liberar una reserva no elimina
la de otro animal. Al destruir el objetivo se libera inmediatamente su reserva.

Los componentes se cachean fuera del estado persistente: cambios de topología,
coste o geometría los invalidan. No se repite la comparación cuadrática entre
segmentos en una escena sin cambios; la firma de estructuras se comprueba al
consultar los conjuntos. No se acredita una medición nueva de rendimiento.

## Aceptación

Para cada una de las cinco culturas, se pagan un centro y una cadena adobe de
cinco piezas. Tres facóqueros explícitos seleccionan objetivos mediante las
rutas nativas: uno reserva el centro, otro la cadena y el tercero se retira con
golpes sobrantes. La carga usa SaveRepository y Navigation nuevas. Ambos estados
completos coinciden en cada paso de 50 ms hasta salir la incursión; durante toda
ella se comprueba la exclusividad de cada conjunto y su propietario registrado.

Una cadena pagada más larga vale más de 800 aunque cada pieza valga menos: el
primer animal elige la defensa agregada por encima del centro. Una condición de
reserva antigua en conflicto verifica que liberar al segundo no borra al dueño.
La pérdida preparada de una raíz se aplica mediante hitStructure; las reservas
se recalculan y la carga sigue produciendo un estado idéntico. Esa pérdida es
una condición de QA, no se atribuye a un golpe del animal.

Se pagan también tres grupos de dos mijos contiguos: tres animales reservan tres
grupos distintos. Tras destrucción y carga, ningún grupo vivo comparte dueño;
se destruyen realmente los seis cultivos y ambos estados coinciden hasta el fin.
Las condiciones son crédito de 20.000 monedas, terreno plano sin props, bounds
de 96 m y composición explícita; no se fuerzan targets, poses o presupuestos.
No se reclama una nueva inspección WebGL ni la matriz de obstáculos de biomas.

[Pruebas integradas](../tests/acceptance-defensive-reservations.test.js),
[geometría y caché](../tests/defensive-groups.test.js),
[salida dirigida completa](qa/defensive-reservations/directed.txt): **141/141**,
cero fallos, cancelaciones u omisiones, 6.630,4214 ms. Incluye cargas de incursión,
combos/VFX, planificación diurna, navegación, reparaciones y separación física.
[Build](qa/defensive-reservations/build.txt) aprobada en 4,91 s, con el aviso
habitual de bundle mayor de 500 kB. [Paquete](qa/defensive-reservations/web-package.txt)
aprobado: 554 archivos, 379.692.564 bytes, 794 enlaces relativos y 20 GLB de runtime.
La CI completa nueva se comprobará por separado; no se atribuye todavía un resultado.
