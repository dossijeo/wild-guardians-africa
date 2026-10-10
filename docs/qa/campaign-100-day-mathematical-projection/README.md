# Revisión de la proyección de 100 días

[Tabla completa, ambos escenarios](projection.md) — [Flujos, parámetros y procedencia](projection.json)

La petición del usuario es evaluar coherencia matemática antes de nuevas simulaciones largas. No se ha lanzado ninguna campaña nueva de 20/100 noches. La proyección usa la alternativa de conservar las ganancias altas de e040, **no el precio actual de mijo en main**. No cambia producción.

## Resultado de esta candidata

- Con defensas hipotéticamente eficaces: día100, 3.737.932 monedas, 843 cultivos y 312 piezas de muralla acumuladas. La eficacia del 90% de intercepción es un supuesto, no un resultado medido.
- Sin defensas: día100, 1.293.781 monedas y 324 cultivos. En la etapa estable sigue ganando 9.680 monedas/día pese a perder unas 179 plantas/día.
- En ambos escenarios la horda nocturna tardía tiene media8,99 animales y rango6–12. Cada planta recibe incremento2 y un golpe puede alcanzar como máximo7 plantas; los edificios conservan daño×1. Los máximos no son impactos efectivos garantizados.
- El equilibrio contable tardío requiere aproximadamente226,72 pérdidas/día, suponiendo280 siembras, semilla media38,625, pago realizado por entrega218,96 y productividad medida1,878 entregas/trabajador. Fórmula: pérdidas=280−280×38,625/(218,96−30/1,878). Es un límite estacionario, no probabilidad de derrota ni una curva de 100 noches.

**No aceptar esta alternativa como suficiente para provocar derrota económica por descuidar cultivos.** El stock, los jornales y las cosechas se reducen conjuntamente después de las pérdidas: no se puede restar el valor de 179 plantas a unos ingresos antiguos constantes y asumir que esa cuenta representa toda la partida.

Antes de otro piloto hay que revisar ganancias y/o capacidad destructiva real, incluyendo la posibilidad de destruir estructuras. La cobertura espacial limita el daño en área; aumentar un máximo teórico sin aumentar vecinos realmente alcanzables no garantiza más bajas. No se impone el ejemplo×10 del usuario como objetivo.

## Contraste con el diagnóstico corto ya iniciado

El diagnóstico nativo de seis noches había comenzado antes de la nueva petición y terminó sin reiniciarse. Fuente4d939cb8, evidenciasac7c373c, rama `codex/frozen-area12-pilot`:

- Responsable: 8.196 monedas,234 plantas,52,5% de inactividad significativa;428 murallas intactas, cero impactos estructurales y cero reparaciones pagadas.
- Sin defensas:15.172 monedas,485 plantas,26,17% de inactividad significativa.
- Ambos terminaron seis incursiones físicamente, pero ambos incumplen actividad<25%. No llegó el umbral de daño letal60000 ni la fase tardía.

Estos negativos no se han usado para inventar una eficacia de murallas ni para ajustar retrospectivamente la tabla. La hipótesis de protección del modelo sigue sin acreditarse. La gran diferencia entre el perímetro estimado y las428 piezas reales confirma que la tabla de murallas es aproximada, dependiente de la forma espacial.

## Verificación y límites

Tres contratos pasan (230,3311ms): apertura coincide con el dinero/plantas del original, los200 registros conservan exactamente dinero y stock agregado, y las composiciones introductorias/fallback usan presupuestos legales. No se simulan trabajadores ni rutas en estas pruebas.

Los ingresos históricos reconstruidos para calibración suman504.327 monedas y coinciden con el valor original de las cajas realmente entregadas. Se guardan los hashes de ambos archivos fuente y de balance, además del balance de referencia completo, para que las comprobaciones locales no dependan de la existencia de otro worktree.

No hay estimación de inactividad en esta tabla; no puede acreditarse su umbral del25%. El modelo tampoco prueba colisiones, progreso hídrico, costes intradía, agotamiento espacial, destrucción de centros, incursiones diurnas ni victoria/derrota. Los rendimientos históricos trasladados a100 días son hipótesis de previsión, no garantías.
