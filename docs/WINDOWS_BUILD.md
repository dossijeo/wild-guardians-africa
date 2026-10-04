# Windows y distribución web

El mismo `dist/` relativo se incrusta en la aplicación Tauri 2. No hay servidor Vite en la versión instalada ni copia extra de los GLB originales. Windows usa WebView2; el instalador NSIS descarga su bootstrapper si el equipo aún no tiene el runtime. Las partidas del navegador y de la aplicación pertenecen a orígenes distintos y no se transfieren automáticamente.

## Desarrollo local

Además de Node.js 20, requiere Rust estable, Microsoft C++ Build Tools con Desktop development with C++ y WebView2. Consulta los [prerrequisitos oficiales](https://v2.tauri.app/start/prerequisites/).

```sh
npm ci
npm run desktop:dev
npm run desktop:build
```

El ejecutable queda en `src-tauri/target/release/wild-guardians-africa.exe`; el instalador en `src-tauri/target/release/bundle/nsis/`. La compilación ejecuta primero Vite y la verificación de rutas/recursos del paquete web. El wrapper no solicita acceso a archivos del usuario ni añade plugins nativos al juego. Su icono provisional es WG.

## GitHub Actions

`Build Windows desktop` compila con Rust en `windows-latest`, comprueba EXE/NSIS y ejecuta el EXE con `--smoke-report PATH`. Ese modo exclusivo de QA carga los veinte modelos meshopt con el decoder WASM de producción, comprueba WebGL 2, Worker, MP3 y almacenamiento, y arranca el mundo real Gran cañón/Mapungubwe desde el menú. El informe queda como artefacto y en el resumen del job. No reemplaza una revisión visual, auditiva, de rendimiento ni una partida completa en PC.

El instalador y el EXE se descargan individualmente, sin ZIP envolvente. No están firmados con un certificado de editor; no se han publicado en Releases ni en itch.io. Los artefactos duran siete días. Cada nueva ejecución del mismo workflow/ref cancela la anterior; ramas diferentes se ejecutan independientemente.

`Validate game` conserva las verificaciones y el ZIP reproducible `wild-guardians-itch.zip`. La subida usa [upload-artifact v7 con `archive: false`](https://github.com/actions/upload-artifact), de modo que al descargar ese artefacto desde GitHub se recibe el ZIP original con `index.html` y los recursos directamente dentro. El artefacto adicional `wild-guardians-build` contiene los archivos de `dist/` para inspección. El ZIP local generado por `npm run package:itch` ya tenía esa estructura; el anidamiento procedía del envoltorio anterior de Actions.

El soporte de Wake Lock depende de WebView2 y del contexto seguro, igual que en la web. La app conserva el fallback de vídeo existente; el smoke registra `secureContext`, pero no acredita que una pantalla física permanezca despierta. Los sonidos se decodifican en el smoke; no se certifica su escucha en un runner sin altavoces.
