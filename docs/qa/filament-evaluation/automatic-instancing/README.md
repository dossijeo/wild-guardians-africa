# Fallo acotado de instancing automático

Filament oficial v1.78.0, WASM fijado en `dependency.json`, escenario A congelado.
La prueba usa el mismo GLB y la misma inicialización del benchmark. No modifica
el runtime oficial, el GLB ni el código del benchmark guardado.

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='ruta/absoluta/playwright/index.mjs'
node tools/filament-evaluation/automatic-smoke.mjs
```

El servidor del experimento debe estar ejecutándose en el puerto 5296.
El runner intercepta `GPUDevice.prototype.createBindGroup` antes de inicializar
el motor y registra los descriptores nativos cuando la API rechaza una llamada.
Para el control sin sombras intercepta temporalmente la respuesta HTTP de
`benchmark.js`, cambiando únicamente la activación de sombras y `castShadows`;
no escribe esos cambios al disco.

| Control | Resultado observado |
| --- | --- |
| Instancing automático activado | Falla al crear el bind group per-renderable. |
| Instancing automático activado, sombras desactivadas | Mismo fallo y mismos bindings sin recurso. |
| Instancing automático desactivado | Inicialización y captura correctas, sin error de bind group. |

Cada variante tiene su registro JSON y captura PNG en esta carpeta. No son
muestras de rendimiento ni autorizan conclusiones cuantitativas de velocidad.

El descriptor rechazado tiene layout `layout_perRenderable_3`. El binding 0
incluye un `GPUBuffer` válido y un rango de 16.384 bytes; los bindings
2, 4, 6, 7, 8, 9, 10 y 11 tienen `resource: undefined`. El navegador rechaza
la conversión del descriptor con `Required member is undefined`.

La explicación coincide con el código fijado:

1. [`RenderPass::instanceify`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/src/RenderPass.cpp#L288)
   agrupa dibujos equivalentes y excluye skinning, morphing e instancing explícito.
2. [`RenderPass::finalize`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/src/RenderPass.cpp#L390)
   crea un descriptor-set nuevo con el layout per-renderable completo y actualiza
   solamente `OBJECT_UNIFORMS`. El comentario explica que se asume que basta ese
   UBO para los comandos agrupados.
3. [`WebGPUDescriptorSet`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/backend/src/webgpu/WebGPUDescriptorSet.cpp#L54)
   preasigna todas las entradas del layout. `lockAndReturn` entrega después todas
   a `CreateBindGroup`, incluidas las que no recibieron recursos.
4. [`WebGPUDescriptorSetLayout`](https://github.com/google/filament/blob/c1dc4e444784850d6dc891a1fb38747c30b85463/filament/backend/src/webgpu/WebGPUDescriptorSetLayout.cpp#L106)
   multiplica los bindings internos por dos y añade samplers separados. Los
   bindings vacíos corresponden a recursos adicionales de skinning/morphing del
   layout compartido, aunque el comando agrupado no los utilice.

La evidencia apunta a una incompatibilidad interna entre esta ruta automática
y el descriptor-set WebGPU de la versión fijada. No se encontró una corrección
mediante configuración normal de cámara, materiales o sombras. Desactivar el
instancing automático restaura el control. El instancing explícito de hierba
ya ejecutado es una ruta diferente y no queda invalidado por este fallo.

No se ocultaron los bindings indefinidos desde JavaScript: eliminarlos no
satisface por sí solo un layout que declara esos recursos. Reparar la ruta
requeriría completar recursos válidos, cambiar el layout utilizado o una
corrección equivalente en Filament. Se conserva el fallo como límite de la
evaluación, sin crear un fork ni extrapolarlo a todos los usos de WebGPU.
