# f-R4 parcial: consecuencias nativas preparadas de una parada

Fecha: 2026-11-14. Base: `10dc701c5`. Rama: `codex/guardian-3d-animation`.
Continúa el [plan integrado](integrated-gpu-migration-plan-20261104.md) y la
[conservación de asignaciones](f-r4-retained-native-terrain-20261114.md).
Los once padres A6 y e-R3/e-R4/f-R4 permanecen abiertos.

Continúa con [autoridad del cuerpo suspendido preparado](f-r4-native-suspended-body-control-20261114.md); la sustitución visual de Idle/puerta sigue pendiente.

## Cambio efectivo

La propuesta de mundo de la autoridad prepara ahora las consecuencias completas
de detener sus rutas afectadas. Incluye las paradas encadenadas por un cuerpo
que pasa a ocupar un disco fijo y por un motor de puerta compartido que debe
congelarse. Antes del efecto se conocen las asignaciones originales, cuerpos,
estados posteriores, generaciones de suspensión, poses/fases ejecutadas y aperturas
de las puertas afectadas. Las rutas y el mundo confirmados siguen intactos.

La proyección usa los mismos predicados que la ejecución real. Se extraen del
camino existente la posibilidad de suspensión, el visitante de conflictos con
discos detenidos y la condición de congelación de una puerta al liberar un cruce.
La aplicación real continúa usando esos predicados y el mismo orden de eventos.
La preparación expande una cola determinista de consecuencias sobre los índices
existentes; conserva solo IDs y filas resultantes. No clona el mundo ni IntentState,
no copia rutas completas y no crea otro planificador o registro de cuerpos.

Las filas pertenecen a la propuesta ya existente y a su read set exacto de sesión,
ticket, tiempo, cuerpos, entidades, intenciones, reservas, reloj, puertas y mundo.
Se borran al consumir/cancelar el ticket y se rechazan si queda obsoleto. La copia
JS del recurso canónico contiene arrays propios: modificarlos no altera C++.
Una fila proyectada nunca publica una revocación ni un handle ejecutable; tampoco
predice números de secuencia del futuro log de control.

El ABI adicional `nav_intent_world_proposal_effects_version() === 1` expone el
conteo/puntero de filas de rutas y puertas del ticket. Los recursos de propuesta
canónica incorporan `routeEffects` y `gateEffects` con versión, anchura y Float64
propios. La prueba de conservación anterior se contrasta con la ausencia de
consecuencias de ruta. La lectura limita cada conjunto a 32.768 filas.

| Datos | Contenido |
| --- | --- |
| Ruta, columnas 0–4 | Actor, secuencia de asignación original, slot, generación y cuerpo. La sesión pertenece al sobre de la propuesta. |
| Ruta, columnas 5–7 | Estado posterior, tiempo de parada y generación suspendida propuesta; cero si requiere un plan nuevo. |
| Ruta, columnas 8–25 | La pose nativa de 18 componentes existente, con posición planar y fases conservadas; running y velocidad pasan a cero. El apoyo vertical sigue perteneciendo al soporte gráfico confirmado. |
| Puerta, tres columnas | ID, mecanismo y apertura fija resultante. |

## Referencias y decisiones

- [Godot 4.5.1, animation_node_state_machine.cpp](https://github.com/godotengine/godot/blob/4.5.1-stable/scene/animation/animation_node_state_machine.cpp):
  `_make_travel_path` y los recorridos con `p_test_only` separan la composición de
  una transición de su aplicación. Aquí se prepara el resultado dentro del
  propietario nativo y se conserva el estado publicado hasta el commit.
- [Three r180, AnimationAction.js](https://github.com/mrdoob/three.js/blob/r180/src/animation/AnimationAction.js):
  `_updateTimeScale` y `_updateTime` separan el avance de la pose ya alcanzada.
  Las consecuencias conservan pose/fases y expresan la parada mediante datos;
  la aplicación gráfica de esa transición sigue pendiente.

Los algoritmos de conflicto y de cierre proceden del ejecutor nativo ya validado
del repositorio. Se reutilizan mediante predicados compartidos, sin implementar
otra versión de colisión ni incorporar dependencias.

## Validación y límites

Pasan 52 pruebas dirigidas. La selección amplia de 146 archivos registra 1639
casos: 1637 aprobados y los dos fallos heredados Carry/Harvest, sin omisiones
ni cancelaciones. Compilan standalone y pthread. Build aprobado en 44.69s;
308 scripts inline y los tres módulos propios pasan sintaxis. El
[recibo de validación](performance/native-proposed-stop-effects-validation-20261114.json)
registra selección, comandos y hashes anteriores al ensayo final. El
[recibo GPU de regresión](performance/native-proposed-stop-effects-20261114.json)
conserva el escenario de asignaciones no afectadas, sin atribuirle cobertura
gráfica de las paradas propuestas.

Las nueve pruebas nuevas comparan proyección y commit real: cadena de tres cuerpos
con una cuarta ruta conservada; puerta compartida con dos suspensiones y apertura
exacta; cambio de terreno, barrera individual, evacuación futura y restauración
de prop; animal; ticket obsoleto y copia pthread. Antes del commit no cambian
eventos, cuerpos ni puertas. Después coinciden actores, handles revocados, estados,
generaciones y poses. Se comprueba también el aislamiento de los arrays copiados.

El ensayo GPU del incremento anterior se repite con estos binarios y lectores
nuevos. Mantiene el trabajador original y los ocho cortes de mundo de la clase
conservada, durante bloqueos de preparación y avances directos C++. No acredita
todavía la presentación de una parada: en ese ensayo las consecuencias están vacías.

Siguiente punto: incorporar estas consecuencias a la misma reserva/paquete gráfico
antes de revocar las asignaciones, incluida la espera y la apertura fija de puerta.
El surface sigue rechazando las mutaciones que afectan a una asignación activa;
esa protección se mantiene hasta implementar y validar su sustitución. La
alimentación ordinaria, todas las intenciones, consecuencias de gameplay y
persistencia siguen pendientes. Este incremento no cierra f-R4 ni A/B/C.
