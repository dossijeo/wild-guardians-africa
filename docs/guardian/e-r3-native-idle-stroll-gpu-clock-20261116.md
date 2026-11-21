# Paseo Idle: kernel residente, reloj y control directo del consumidor

Continuación de la [admisión preparada 22](e-r3-native-idle-stroll-admission-20261116.md). Este incremento conecta la familia al kernel de movimiento existente, reloj/picking y Host directo. El actor/Surface originales y la comprobación en hardware son el siguiente punto; no se anuncia todavía capacidad en el draw worker.

## Investigación aplicada

Antes del mecanismo se leyeron implementaciones reales de Three r180 instalado: [`Bindings.getForRender`, `getForCompute`, `_update`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/Bindings.js) y [`UniformsGroup.update`, `updateNumber`](https://github.com/mrdoob/three.js/blob/r180/src/renderers/common/UniformsGroup.js). Los grupos se crean cuando falta su asociación; uniformes y versiones de textura deciden actualizaciones de datos. Se adapta ese patrón manteniendo identidades y metadatos de autoridad fuera de las claves estructurales, sobre los propietarios existentes. No se añade dependencia, caché global, shader paralelo ni renderer.

## Comportamiento

El soporte de terreno confirmado y la tabla finita reutilizan el empaquetador y kernel TSL usados por Home. El paseo conserva su propia referencia `nativeStroll`, distinta de la propuesta `nativeIdleStroll`, y no hereda permiso Home. El reajuste de una propuesta no publicada retiene textura, uniforme y clave; sólo actualiza datos si cambian, exige sucesor válido y deja de ser posible al sellarla o compartirla. La comparación de shaders compilados para propuestas nativas genuinas Home/paseo da el mismo programa de vértices.

Cliente y Host exigen template, familia, frontera y asociación exactos para preparar, drenar e instalar. El reloj tiene fase relativa y origen módulo propios; el picking conserva el float realmente escrito y el origen de ejecución adquirido. El Host guarda ese origen al instalar, de modo que la revocación no vuelve al tiempo de la propuesta anterior. Una retirada acota el dibujo a su última fase válida. El paquete anterior sigue visible mientras el paseo permanece preparado y el compañero avanza. Los otros nueve tipos rechazan su presencia en un relevo ajeno; un consumidor sin capacidad anunciada lo rechaza antes de enviar un reloj sin alcance.

## Validación y alcance

Comandos, archivos, hashes y límites en [el informe](performance/native-idle-stroll-gpu-clock-validation-20261116.json).

- **12 casos nuevos:** cuatro perfiles/cuerpo/fases/terreno, reajuste conservando identidades, igualdad de shader Home/paseo, referencias incompatibles; instalación real por puertos/Host, picking falsificado, retención del ciclo anterior, retirada con origen reajustado y falta de capacidad.
- **14/14 pruebas dirigidas**, 9424.4902 ms, incluyendo dos controles Home existentes.
- **1189/1189 pruebas de regresión en 103 archivos**, 634759.81 ms. **Build de producto correcto en 46.17 s.** Entradas comprobadas idénticas durante ambos trabajos; 17 entradas nativas sin recompilar y 16 archivos locales ajenos conservados.

Fuente WASM, control, publicación y ambos MessageChannels son reales; GPU y recibo de cola son dobles deterministas. En ese fixture se conserva el buffer estático de 36 bytes y los IDs de protocolo; se contabilizan aparte una copia de uniforme nativo de 16 bytes y un binding durante preparación, sin nuevos buffers después de READY. Esto no demuestra costes de hardware ni recuperación de los 3123 recursos. La paridad CPU/tabla usa terreno visible confirmado y 40 instantes por perfil; no sustituye una captura GPU.

## Siguiente punto

Integrar el paseo preparado en el mismo actor, roster y Surface residentes, comprobar relevo/selección en hardware y conservación de bancos y recursos. Después siguen Game22, la fuente estacionaria real y REST tras llegar, aproximación/anclas/cancelación y productor ordinario. Otras clases/finales/puertas, nacimiento/sustitución en vivo, recuperación incremental integral de 3123 recursos sanos y cierres A6/A/B/C siguen abiertos. No se inicia D.
