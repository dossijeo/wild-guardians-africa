# Solapamientos y recuperación móvil de trabajadores

Esta rama parte de `main` `44da3cac` y se actualizó con el merge `84edd628`. No cambia la simulación: los umbrales temporales ensayados en `walkTo()` se revirtieron tras medirlos. Las sondas permiten elegir explícitamente `legacy` (`Navigation` de JavaScript) o `wild-engine` (apertura C++/WASM con intenciones nativas). El nombre histórico `simulateNativeCampaign()` no determina por sí mismo cuál de los dos backends se utiliza.

## Experimento heredado

Con `legacy`, Sabana/Mapungubwe/712 y estrategia `good`, ocho noches produjeron 38 eventos `ActorMobileCollisionRecovery`, todos de trabajadores: 18 hacia riego, 11 hacia cultivos, siete hacia el poblado y dos hacia entregas. El vecino más cercano en la captura previa caminaba en 23 casos, actuaba en siete, transportaba en tres, huía en cuatro y regresaba en uno. Ser el vecino más cercano no prueba que fuera el único obstáculo del segmento. El primer evento, día 1 a los 67 s, ocurrió con dos trabajadores a 0,61 m; el otro ya se alejaba, pero la fase móvil se activó antes de que se desplazara en ese tick.

En 14 noches se registraron 84 ticks con algún solapamiento: 31 entre 0 y 3 s, 14 entre 3 y 10 s, ninguno entre 10 y 30 s y 39 después de 30 s. En el último periodo hubo 40 pares solapados; en 38, al menos un trabajador seguía en `mobilePhaseRemaining > 0`. Los otros dos pueden ser la continuación de una fase recién terminada u otra causa. `addHiredWorker()` coloca a todos los contratados en el mismo `village.entry`, lo que explica un problema separado al comienzo de la jornada.

Se ensayaron umbrales de 6 y 12 s de atasco, y 30 s tanto para atasco como para falta de progreso, manteniendo código, semilla y política. Una sola corrida por brazo no es un benchmark ABBA ni permite atribuir una diferencia económica únicamente al umbral.

| Espera `legacy` | Ticks solapados después de 3 s | Recuperaciones | Entregas | Cultivos vivos | Trabajadores | Monedas |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 s (`main`) | 53 | 97 | 1.464 | 126 | 23 | 949 |
| 6 s | 47 | 95 | 1.559 | 120 | 23 | 1.079 |
| 12 s | 41 | 85 | 1.546 | 122 | 22 | 989 |
| 30 s | 16 | 64 | 1.511 | 98 | 19 | 984 |

Todos completaron 14 noches sin resultado terminal. Esperar más reduce cruces, pero no los elimina y cambia la campaña. Desactivar por completo la recuperación también redujo entregas y cultivos en el [ensayo anterior](https://github.com/dossijeo/wild-guardians-africa/blob/f10f71e0b20cf83a0ebb115782f03e9b687116e1/docs/qa/worker-mobile-recovery/README.md). Ninguno de esos cambios temporales es candidato a integración por estos datos.

## Comprobación con Wild Engine

Se abrió `createSpatialCampaignOpening` con `nativeIntents:true`, `nativeWallPlans:true` y `reloadRaids:false`, sin cambiar `walkTo()`. En ocho noches hubo 14 ticks solapados: nueve en los primeros tres segundos y cinco después de 30 s; estos últimos tenían fase móvil activa. En 14 noches hubo 154 ticks: 24 entre 0 y 3 s, nueve entre 3 y 10 s, cuatro entre 10 y 30 s y 117 después de 30 s. De 126 pares después de 30 s, 54 tenían una fase móvil activa. La campaña llegó a 14 noches con 873 monedas, 132 cultivos vivos, 23 trabajadores y 1.314 entregas. Su trayectoria difiere de `legacy`; esos tiempos y resultados económicos no son un A/B del coste de navegación.

El día 13 aparece otro problema: `worker-12053` y `worker-12056` permanecen en huida casi en la misma posición hasta terminar la noche, sin fase móvil activa. A los 573 s estaban cerca de la entrada del poblado `(60, 0)`. El segundo tenía ruta hacia `home-village-1`, con próximo punto `(60, -2)`; el punto y el segmento estático eran transitables, pero el segmento dinámico estaba ocupado por otros trabajadores que también huían hacia la entrada. Es una cola de regreso congestionada, no una prueba de barrera estática. La inspección puntual aún no determina el primer evento que produjo su solapamiento ni por qué el primero carecía de ruta en ese instante.

La corrección funcional debe tratar por separado la salida simultánea del poblado, el acceso de varias unidades a la misma entrada y la cesión física en pasillos y puntos de servicio. Debe conservar las entregas y comprobar campañas prolongadas. No se integran los umbrales `legacy` en Wild Engine por extrapolación.

Reproducción sobre la revisión deseada:

```sh
node tools/experiments/probe-worker-recovery-context.mjs 8 712 legacy
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe legacy
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
```

Para registrar un par concreto en Wild Engine, antes del último comando se pueden establecer `WG_WORKER_INSPECT_DAY=13`, `WG_WORKER_INSPECT_TIME=573` y `WG_WORKER_INSPECT_IDS=worker-12053,worker-12056`. El diagnóstico adicional consulta la transitabilidad estática y dinámica una sola vez; no se usa para comparar rendimiento.
