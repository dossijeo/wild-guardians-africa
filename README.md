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

GitHub Actions ejecuta estas comprobaciones al subir a `main` y permite una ejecución manual. Los cambios se registran con conventional commits y se suben directamente a `main`.
