# Inspección previa del menú (sin implementación antes de fusionar)

El menú publicado no usa WorldScene ni Three.js: tools/prepare_menu.py adapta el renderer WebGL2 del archivo references/extracted/Wild_Guardians_Africa_Menu_V2_8_CORREGIDO_Balafons_Call/script-6.js y genera public/menu/native.js e index.html. src/ui/menu-integration.js inserta navegación de producción en su closure. Hay seis payloads en el manifiesto.

Puntos que deben conservarse al renovar la composición:
- navigate/back y estados entering/panel/home; regreso interpola parallax sin salto (líneas 338–383).
- draw/tick y gestión de resolución por calidad; no añadir otro bucle permanente.
- Luces locales y bloom del renderer nativo, partículas y modelo central; no sustituirlos por una imagen plana que pierda la iluminación interactiva.
- Hotspots, raycast, teclado/foco/inert, Escape y rutas de paneles; integración de biblioteca, música y salida nativa.
- Rutas del paquete y paridad del generador: tests/menu-generation-parity.test.js y menu-library-fullscreen.test.js.

La referencia vigente es 13762.png (tótem central, paisaje profundo con capas, personajes/vegetación de primer plano, guardianes en las nubes). La implementación debe empezar después de confirmar la fusión; esta inspección no cuenta como menú terminado. Hace falta capturar el estado real anterior, preparar capas y verificar acercamiento, regreso, resoluciones y coste antes/después.

## Primer recurso tras la fusión

Generado con imagegen integrado usando 13762.png como referencia: public/menu/art/sanctuary-valley-v1.png. Prompt: paisaje panorámico 16:9 de sabana africana al atardecer, mesas, cascada derecha, río, poblados y acacias, cinco guardianes en las nubes; eliminar texto, logo, UI, tótem central, personajes y marco vegetal cercano; reconstruir paisaje continuo detrás para composición posterior. Imagen inspeccionada: centro despejado y paisaje completo; guardianes más contrastados que referencia, evaluar en composición antes de aprobar. Todavía no conectado al menú.

Primer plano generado con imagegen integrado: public/menu/art/sanctuary-foreground-v1.png. Prompt: recrear únicamente cuatro personajes africanos estilizados vistos de espaldas en esquina inferior izquierda, rama de acacia superior izquierda, flores y rocas en borde inferior, iluminación dorada del mockup; fondo y centro transparentes, sin paisaje/tótem/UI/texto. Inspección: grupo y marco conservan centro libre; pendiente validar alpha y composición real.
