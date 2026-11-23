# Identidad de las barreras al recargar Repair sólido

El guardado público a t=30,85 s, 100 ms dentro de Repair, contiene 115 barreras. Durante la partida, la reparada se añadió como ID 115. La reconstrucción original la asignaba al ID 1 por el orden de Game, desplazaba las demás y detenía la recarga. [Control anterior](native-solid-repair-checkpoint-baseline-20261123.md).

El checkpoint v2 guarda cada dueño de pared y los IDs de sus proxies en orden. La autoridad nueva reconstruye las formas autorizadas por Game y comprueba una correspondencia completa de dueños y proxies. Compara los demás campos del mundo y usa la restauración existente de Wild Engine para recuperar los IDs y el contador guardados. El espejo registra esos IDs para las retiradas posteriores y el contador conserva el siguiente identificador disponible.

El Worker entrega el checkpoint al constructor antes de publicar regiones, cuerpos o declaraciones nativas. La verificación final compara el snapshot completo y la residencia. En v2 también compara el mapa de dueños.

En v1 se acepta primero la reconstrucción exacta. Si el orden de asignación difiere, se exige una biyección completa de formas de proxy únicas y la verificación final de todos los campos con los IDs exactos. Se rechazan formas repetidas ambiguas, proxies faltantes y cambios de máscara, geometría u otros campos.

Los polígonos de centros y escudos y las formas de los portones deben coincidir exactamente con el checkpoint.

Jolt reserva IDs explícitos y rechaza colisiones de identidad. Detour recupera el índice y la generación de un tile al cargarlo. Wild Guardians aplica el patrón de identidad explícita con la restauración de barreras existente. [Jolt 5.3.0](https://github.com/jrouwe/JoltPhysics/blob/v5.3.0/Jolt/Physics/Body/BodyManager.cpp#L309-L370), [Detour 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/Detour/Source/DetourNavMesh.cpp#L862-L918).

## Evidencia y ejecución

Seis controles con WASM real cubren retiradas después de recargar, asignación posterior de IDs, v1 exacto y unívoco, v2 con dueños distintos de formas idénticas, orden de los proxies de portón y rechazo de cambios de dueño, máscara, forma, polígonos o semilla. Repair ordinario llegó al guardado público v2 a los 100 ms y se abrió en un Worker de autoridad nuevo con el saldo, el tiempo y la curva guardados. El mismo control reproduce el fallo si se omite el envío del checkpoint al constructor del Worker.

Pasaron 51 pruebas de integración y el build WebGPU Worker terminó en 57,88 s. Los WASM canónicos se conservaron.

Se comprobó además el checkpoint v1 original, SHA-256 `099a5167ec0d79c710830cd18f5edd362d51d82f0df20739cfec7fad96eda63a`. La autoridad nueva conserva los 115 IDs y el proxy 115 sigue perteneciendo a `structure-749`.

Controles dirigidos con Node 20.

```powershell
node --test tests/native-wall-bootstrap-identity.test.mjs tests/native-authority-bootstrap.test.js tests/fresh-worker-bootstrap.test.js tests/worker-save.test.js tests/native-gate-proxy-adoption.test.js
```

En NVIDIA Turing, el checkpoint original superó el arranque y la comprobación del primer dibujo en pausa a t=30,85 s. Al reanudar, la autoridad adquirió Action15 con el ticket 2 a t=32,60 s. El checkpoint visual posterior falló con `Native world changed outside its committed resource boundary` después de confirmar t=33,65 s. Sigue pendiente la publicación de recursos de Action15 y la validación de la curva en movimiento. El recibo de la recarga tiene SHA-256 `c679c2cff1ea80dfabfa59073e3e7011cdedd3f2b131afe85b70e343fc4d72d`.
