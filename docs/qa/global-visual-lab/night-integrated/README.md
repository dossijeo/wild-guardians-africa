# Legibilidad nocturna integrada

20/10/2026. Se conserva uNightLight=1,55 para Sabana, Gran Rio, Manglares, Volcanes y Gran Canon dentro de ?visualLab=global-lighting. Desierto, renderer por defecto y biomas desconocidos permanecen en 1,12. No cambia exposicion del cielo, direccion de luz, sombras ni la curva de tiempo. No modifica reglas, navegacion o simulacion.

La intensidad se elige por bioma al actualizar el uniforme compartido. El shader sigue interpolando entre iluminacion diurna y nocturna usando uNight. No se anade codigo por fragmento, texturas, geometria ni programas. Suelo, objetos y agua mantienen sus rutas existentes.

## Campana y transiciones

48 capturas integradas, seis biomas, dos variantes y cuatro fases: dia (dia 1, tiempo 150), anochecer (300,25), noche (350), amanecer (dia 2, tiempo 0,25). Partidas reales desde menu, semilla 712, calidad media, 1280 x 720, pausa QA, reloj visual fijo y sin entidades anadidas. comparison.json verifica 24 parejas con camara, objetivo, tiempo, dia, uNight, calidad y poblacion iguales. Cero errores de pagina/HTTP registrados. El [piloto previo de campana](../night-campaign/README.md) conserva otras 48 capturas.

- [Sabana antes](sabana-base-settlement-night.png) / [integrada](sabana-candidate-settlement-night.png).
- [Rio noche](gran-rio-candidate-settlement-night.png).
- [Manglares amanecer](manglares-candidate-settlement-dawn.png).
- [Volcanes noche](volcanes-candidate-settlement-night.png).
- [Canon noche](gran-canon-candidate-settlement-night.png).
- [Desierto control](desierto-candidate-settlement-night.png).

Se observa mejor lectura de fachadas, rocas y parte de la vegetacion sin perder sombras. Volcanes sigue necesitando trabajo de suelo oscuro y los cultivos pequenos no quedan resueltos. No afirmar calidad de mockup nocturno: las seis referencias facilitadas son diurnas.

captures.json incluye 216 muestras de uniforme (12 paginas x 2 transiciones x 9 tiempos). Para cada bioma, uNight coincide exactamente entre base e integrado, crece monotonamente al anochecer y decrece al amanecer; la intensidad permanece constante durante cada serie. No se introduce una conmutacion por hora. Es muestreo numerico mas cuatro fases capturadas, no un video ni cobertura continua de todos los tiempos.

## Coste y limites

Cero draws y triangulos adicionales en las 24 parejas. El contador global de texturas difiere -7 en algunas vistas entre cargas y cero en otras; el cambio no crea ni destruye texturas, por lo que no es ahorro atribuible. comparison.json conserva los casos exactos. Desierto mantiene 1,12: sus imagenes no son bit a bit identicas entre cargas (media absoluta maxima por canal 0,096 sobre 255), sin cambio de intensidad.

[ABBA nocturno del piloto](../night-readability/performance-summary.json): delta GPU de -0,087 a +0,396 ms en seis biomas. Negativos no prueban aceleracion; no se repitio benchmark temporal integrado porque se conserva el mismo uniforme y codigo shader. La ronda integrada verifica alcance, contadores, campana y transicion. El presupuesto de todo global-lighting sigue pendiente.

Siete pruebas pasan: politica opt-in por bioma y fases, suelo, roca de Canon y agua compartida. Build Vite correcto, con avisos existentes de importacion far-atmosphere y bundle >500 kB. No se valida aqui cada calidad, semilla ni sesion larga.

## Recomendacion

Conservar dentro del experimento. Mantener Desierto sin este incremento y continuar con vegetacion 3D y separacion de plantas/suelo. La calidad global aun no alcanza los seis mockups. No promover automaticamente a renderer por defecto ni fusionar.

Reproduccion: WG_NIGHT_INTEGRATED=1 con node tools/experiments/capture-campaign-night.mjs. night-qa-route.mjs obtiene el antes en memoria. Pruebas: node --test tests/global-visual-lighting.test.js tests/global-canyon-rock.test.js tests/global-water-surface.test.js.
