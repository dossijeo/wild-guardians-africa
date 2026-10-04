# wild-guardians-africa
Build a thriving farm, protect your village from relentless animal attacks, and survive 100 nights to break the curse threatening your community.

Implementación en curso basada en los labs y el [plan maestro recibido](docs/plan/Wild_Guardians_Plan_Maestro_Definitivo.md). El [registro de implementación](docs/IMPLEMENTATION.md) distingue los requisitos de las comprobaciones ejecutadas.

## Desarrollo

Requiere Node.js 20 y Python 3.12 para verificar los recursos originales.

```sh
npm ci
npm run dev
```

Abre http://127.0.0.1:5173/. Las partidas y opciones se guardan en el almacenamiento local del navegador; cambiar de navegador u origen usa otro almacenamiento.

## Comprobación y compilación

```sh
npm run verify:assets
npm run verify:plan
npm test
npm run build
npm run preview
```

La compilación queda en `dist/`. El servidor debe publicar también `assets/`, `content/`, `menu/`, `selector/` y `library.html`, incluidos en esa carpeta. La verificación del plan comprueba las reglas aritméticas originales; las pruebas de simulación y navegación se ejecutan por separado con `npm test`.

Para itch.io: `npm run package:itch` genera `test-results/wild-guardians-itch.zip`, con `index.html` en la raíz, rutas relativas y sin los GLB originales duplicados. Los originales y sus hashes siguen en el repositorio; el runtime usa variantes meshopt/WebP. [Inventario, tolerancias y QA web](docs/WEB_ASSETS.md). Para regenerar variantes: `npm run assets:compress`; para verificarlas: `npm run verify:web-assets`. `npm run qa:web-package` sirve el build en un prefijo anidado y tres fixtures visibles para revisión en navegador.

Los recorridos de la boquilla se preparan con `node tools/prepare_watering_emitters.mjs` desde los cuatro GLB originales. El runtime lee `content/watering-emitters.json` y solo interpola, para evitar muestrear otro rig al contratar. Las pruebas comprueban su procedencia y alineación contra las animaciones originales; el verificador del paquete comprueba que los datos llegan intactos a `dist`.

GitHub Actions ejecuta estas comprobaciones al subir a `main` y permite una ejecución manual. Los cambios se registran con conventional commits y se suben directamente a `main`.

Diagnóstico de campaña: `node tools/check_campaign.mjs sabana mapungubwe`. Ejecuta un recorrido mínimo con comandos legales: un mijo, contratación de cero trabajadores después del primer día, cien noches, recargas y dos jornadas postcampaña. Sirve para comprobar reloj, incursión tutorial, persistencia y transición final; no certifica rentabilidad de una finca activa ni todos los niveles de amenaza. `tests/campaign.test.js` repite ese recorrido en las treinta combinaciones de bioma y cultura.

Diagnóstico de finca activa: `node tools/check_active_farm.mjs 100 olderMale girasol`. Mantiene cuatro jornadas de preparación sin empleados y después contrata diariamente, cultiva, riega, cosecha, entrega, usa las tres magias y repara con pagos reales. `node tools/check_active_farm.mjs 100 olderMale girasol 20` incorpora los ocho cultivos cuando la finca reúne capital. Ambos recorridos sobre Sabana/Mapungubwe/712 están en `tests/active-farm.test.js`; acreditan esa estrategia, sin garantizar éxito con cualquier contratación o en los niveles de amenaza máxima. `node tools/check_active_farm_matrix.mjs 712` repite la finca mixta en las treinta combinaciones y conserva también los fallos en `test-results/active-farm-matrix-712.json`.
