# Desierto/983: nueva prueba de murallas por tramos tras corregir puertas

El código `bacec170` incorpora en esta rama la puerta automática para cierres
graduales de la PR #45 y vuelve a activar **únicamente en el laboratorio** la
política `service-side` previamente rechazada. Se comparó durante 14 noches
con `planned` usando la misma semilla, bioma, economía, magias y presión
militar. `config.json` fija los genes y los hashes de los módulos; los dos
informes comprimidos conservan los recibos nativos y los `.jsonl` la
progresión diaria. Ningún brazo alcanzó la noche 100.

| Política | Noches | Saldo | Cultivos vivos | Entregas | Murallas pagadas | Coste de muros | Reparaciones |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Por lado accesible (`service-side`) | 14/14 | 1.100 | 139 | 1.283 | 42 | 420 | 79 |
| Perímetro planificado (`planned`) | 14/14 | 1.082 | 143 | 1.239 | 68 | 680 | 0 |

Ambos libros mayores concilian las 14 jornadas. `service-side` entregó 76 y
94 cajas los días 7 y 8; en el ensayo anterior con el motor sin corregir
entregó cero en ambos días y perdió por insolvencia al quedar trabajadores
encerrados. Este replay demuestra que aquella derrota era un defecto de
acceso, no evidencia de una estrategia económica inviable. No demuestra aún
que el trazado por lados sea una defensa mejor: una semilla y 14 noches no
permiten seleccionar una política para las campañas finales.

Un tercer brazo con los mismos genes agrícolas y `wallPolicy:'none'` se
ejecutó sobre la **misma revisión**, en `no-walls-control/`. Terminó 14/14 con
1.321 monedas, 152 cultivos y 1.457 entregas, sin comprar ni reparar muros;
su libro mayor también concilia. Perdió 34 cultivos desde la noche 6, todos
en las noches 11–14. Los dos brazos con muros perdieron cero en ese tramo.
Esto demuestra un efecto físico protector en esa ventana, pero el brazo sin
muros aún terminó con más dinero y cultivos: la ventaja económica de omitir
la inversión defensiva no quedó compensada en 14 noches. **No se declara
dominante ni viable a 100 noches** una estrategia sin muros con esta única
semilla.

Entre las noches 6 y 14 hubo 12 golpes a murallas y 332 HP estructurales
perdidos con `service-side`, frente a 31 golpes y 686 HP con `planned`.
El selector notificó 11.143, 13.346 y 11.140 intentos de objetivo no
disponible en `service-side`, `planned` y `none`. El control sin murallas
confirma que la ausencia de contactos hasta la noche 10 no era protección
por muros: también tuvo cero daños en esas incursiones. Estos contadores no
distinguen por sí solos terreno inaccesible, conectividad desconocida,
reservas temporales o agotamiento de espera; hace falta observación de
entradas, regiones y contactos antes de calibrar daño o economía defensiva.

El informe nativo del brazo `none` precisa el patrón: en las noches 6–10,
todos los animales de la primera oleada aparecieron en un borde del área
activa, agotaron unos 90 s de espera y se retiraron con los golpes intactos.
En la noche 11, los primeros 16 repitieron ese patrón; dos animales de la
segunda oleada nacieron cerca del centro agrícola, atacaron y agotaron sus
golpes. La reconstrucción offline **histórica** de una captura de noche 6
(fuente `20ae0954`, no emparejable con este piloto) devolvió `unknown` para
dos cultivos testigo por especie incluso con los 36 chunks del área activa
residentes: los extremos tenían componentes conocidos, pero el grafo no
resolvió una conexión. Eso no prueba una ruta imposible fuera del área. El
código de entrada intenta primero una formación completa cerca de la cámara
o finca y, si no cabe o no se certifica, acepta una formación en el borde
con sólo una prueba **local** de spawn→salida. La combinación es una hipótesis
concreta para explicar por qué 16 animales esperan y grupos pequeños tardíos
sí llegan a atacar. La siguiente corrección del motor debe comprobar la
accesibilidad física desde las entradas de oleadas grandes, sin teletransportar
animales ni cambiar sus presupuestos de ataque.

Reproducir desde la raíz del repositorio:

```
node tools/evolutionary-balance/run-post-intro-pilot.mjs docs/qa/evolutionary-balance/service-side-gate-fixed-desierto983-14-config.json
node tools/evolutionary-balance/run-post-intro-pilot.mjs docs/qa/evolutionary-balance/service-side-gate-fixed-desierto983-14/no-walls-control-config.json
```

El límite cooperativo fue 60 s de `Game.tick` por día y 900 s reales por
brazo. Ningún brazo alcanzó esos límites. La configuración económica y de
ataques de producción permaneció intacta. La rama y la PR #36 siguen
experimentales, sin fusionar en `main`.
