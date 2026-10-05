# Diagnóstico reproducible del margen agrícola

Se reconcilian las entregas físicas, el libro contable y los precios originales de cinco ensayos ya terminados: Manglares/Saheliana de cien noches y los cuatro perfiles laborales de veinte noches. El archivo de balance conservado coincide con el hash de las fuentes de cada ensayo. No se ejecuta código procedente de ese archivo: se lee únicamente su JSON generado.

| Ensayo | Ingreso | Semillas + salarios + reparación | Margen operativo | Tiempo diurno sin acciones |
| --- | ---: | ---: | ---: | ---: |
| Manglares, 100 noches | 135.973 | 135.570 | 403 | 58,17 % |
| Anciana, 20 noches | 22.910 | 22.732 | 178 | 60,20 % |
| Anciano, 20 noches | 30.241 | 29.703 | 538 | 61,02 % |
| Joven mujer, 20 noches | 23.094 | 22.784 | 310 | 60,95 % |
| Joven hombre, 20 noches | 25.683 | 25.431 | 252 | 64,45 % |

El centro inicial se contabiliza aparte. Las compras de semillas incluyen plantas vivas, cosechadas y destruidas. Los ingresos excluyen cajas todavía sin entregar. No se asignan salarios arbitrariamente a cada especie.

## Fórmula y candidato para probar

`coste operativo = semillas + salarios + reparaciones`

`ingreso objetivo = coste operativo + ceil(coste operativo × margen / 100) − otros ingresos netos`

Se utiliza como objetivo experimental un margen del 20 % del coste operativo, no como requisito aprobado ni resultado final. Se busca el menor factor uniforme en pasos de 0,001 que cumpla ese objetivo con precios enteros. Cada entrega se recalcula desde su valor racional original, conservando multiplicaciones de perfil, magia y eventos; se redondea una sola vez al cobrar.

En los cinco registros, el primer factor suficiente es 1,112. El redondeo de los precios da esta tabla experimental: mijo 11, girasol 36, sorgo 13, maíz 17, batata 23, algodón 178, yuca 32 y plátano 267. Para las mismas entregas de Manglares produciría 165.275 de ingreso y 29.705 de margen operativo. No representa una nueva campaña jugada. El incremento de atracción de las plantas finales sería de 3.075 a 3.622; ambos están en el último tramo, pero la evolución durante la partida puede cruzar umbrales antes.

## Problema independiente: cultivos costosos

En Manglares se plantaron 36 plataneros: 34 fueron destruidos, uno se entregó y uno seguía vivo. Catorce pérdidas ocurrieron antes del primer riego. El algodón perdió 65 de 89 plantas y entregó 19. Su saldo cosecha menos todas sus semillas es negativo: −4.872 para plátano y −3.780 para algodón, antes de salarios y reparación. Subir uniformemente los ingresos no resuelve por sí solo su exposición al daño ni las esperas de tareas.

Los informes calculan también el precio mínimo por especie que recuperaría solamente sus semillas con las entregas históricas exactas. No es una recomendación de precios: sirve para distinguir déficit de flujo general de pérdidas logísticas/destrucción. El plátano exigiría un precio desproporcionado bajo estas pérdidas.

## Reproducción y límites

`node tools/analyze_farm_margin.mjs docs/qa/intensive-mangrove-shield-100 docs/qa/farm-margin-baseline/source-balance.js.gz`

Para los ensayos de veinte noches: usar `docs/qa/intensive-profile-comparison-20` y el tercer argumento `olderMale-`, `olderFemale-`, `youngMale-` o `youngFemale-`.

`node --test tests/farm-margin.test.js` verifica diez casos: cinco campañas, reconciliación, ausencia de mutación, cobro racional exacto, cajas sin entregar, rechazo de ingresos inventados/precios discordantes/riegos incompletos y objetivos inválidos.

Los JSON preservan escenarios y hashes de entradas. Son sensibilidad con producción y pérdidas fijas, no simulaciones nuevas, prueba de reducción del tiempo inactivo ni validación de móvil/render. El candidato necesita aplicarse y medirse con la misma estrategia responsable, campañas nativas completas y malas decisiones capaces de perder. Los parámetros del juego todavía no han cambiado por este diagnóstico.
