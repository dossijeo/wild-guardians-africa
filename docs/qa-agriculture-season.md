# Riego mágico y buena temporada

Corrección `1090300`. El usuario define «Buena temporada» como un bonus de
tolerancia hasta el próximo riego. Crecimiento satisface mágicamente los
checkpoints que atraviesa; ese riego también debe consumir el bonus.

La lógica anterior sólo limpiaba `toleranceBonus` desde la tarea del trabajador.
El checkpoint mágico conservaba el bonus, que sobrevivía al guardado y ampliaba
incorrectamente las tolerancias siguientes. La [regresión previa](qa/agriculture-season/regression-before.txt)
registra tres fallos y un caso físico aprobado sobre `b2d1da0`.

Ahora ambos caminos usan la misma operación de riego satisfecho. Un intento
sin riego pendiente no consume el bonus. La tarea física conserva su evento
`WaterSatisfied`; no se crea un evento físico de trabajador para la magia.

## Evidencia

[88 pruebas dirigidas](qa/agriculture-season/directed.txt), cero fallos/omisiones,
1.431,018 ms. Cubren eventos, crecimiento de las ocho especies, tareas agrícolas,
economía, snapshots, permisos, apuntado y VFX nativo:

- Las ocho especies × intensidades 10/20/30 % pierden el bonus al atravesar el
  siguiente checkpoint bajo Crecimiento, conservando los posteriores pendientes.
- Riego manual y mágico consumen el bonus; una llamada sin deuda lo conserva.
- Un plátano con crecimiento preparado en 94 s cruza el checkpoint de 95 s
  mediante Crecimiento y se guarda/carga. Al acabar la magia alcanza 139 s.
  Su siguiente riego nace en 190 s y congela el crecimiento en 213,75 s, con
  tolerancia original de 23,75 s, una sola tarea de riego y saldo intacto.
- Un trabajador realiza físicamente el cuidado inicial y consume el bonus,
  sin otro cargo ni un segundo evento de riego.
- Crecimiento y Multiplicar se activan en tiempo 299 y cruzan el atardecer
  con `Game.advanceReal`: un segundo diurno y cinco segundos simulados por
  segundo real nocturno. La planta sólo crece en el tramo diurno. Los VFX
  siguen hasta 30/15 s y los cooldowns quedan en 60/105 s al terminar.
  Pausa bloqueante, snapshot y rechazo de una nueva activación nocturna
  conservan el estado; actualizar la presentación no modifica la simulación.

Fixture financiada, postcampaña sin ataques, rutas directas mediante doble de
navegación. La especie, crecimiento inicial y proximidad del atardecer se
preparan expresamente. Los VFX emplean geometría/animación nativa con renderer
doblado; no son nuevas capturas WebGL ni acreditan terreno o incursiones.
QA-115 y QA-120 permanecen parciales: falta cubrir Escudo y completar la
comprobación visual integrada correspondiente.

[Build y paquete web](qa/agriculture-season/build.txt) aprobados: 554 archivos,
379.689.497 bytes, 794 enlaces relativos, 20 GLB runtime sin duplicados originales.
La [CI de la corrección](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37111587850)
estaba en curso al registrar esta evidencia. Las 787 pruebas de la base anterior
no se presentan como resultado de este cambio.
