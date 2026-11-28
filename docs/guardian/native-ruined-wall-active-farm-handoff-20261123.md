# Repair de ruina con Farm adquirido: Stop24 y continuación

Cuando Repair de una ruina sólida afecta un corredor Farm adquirido, se detiene al trabajador con Stop24, se incorpora la colisión mediante kind2 y se reanuda Farm desde la pose detenida. Las tres adquisiciones usan los dueños y el canal de preparación existentes.

## Integración con los dueños existentes

`restoreNativeRuinedWall` comprueba que todos los consumidores afectados tengan un corredor Farm admitido. Revalida Repair antes de cada parada y antes de preparar kind2. El productor ordinario continúa después Farm desde `sourceHeld`. El rodeo pasa por el recorte corregido en `7ef4ff519`. [Corrección geométrica y controles](native-farm-detour-circle-range-20261123.md).

## Orden y cancelación

- Hasta adquirir Stop24, Farm continúa con su trayectoria original, incluso durante READY.
- Después de Stop24, permanece detenido sobre el mismo cuerpo mientras se prepara la pared. HP, colisión, efecto y pago solo cambian al adquirir kind2 mediante la consecuencia ordinaria.
- Una operación estructural competidora invalida Repair. Si Stop24 ya se adquirió, el dueño retenido produce una continuación nueva desde la pose detenida. El canal existente rechaza publicaciones tardías tras cancelar o destruir la preparación.
- Todos los consumidores afectados deben tener el dueño Farm soportado antes de detener al primero. Las demás familias mantienen su rechazo; no se amplía el alcance a Task, Home, Stroll, combate ni magia.
- Los errores de control después de una adquisición conservan su tratamiento terminal. La cancelación del productor usa su señal existente.

## Controles reproducibles

Con WASM canónico y Node 20:

```powershell
node --test tests/native-ruined-wall-repair-active-farm.test.mjs
```

Los cuatro controles usan autoridad WASM, puertos de preparación y control y Host real con una cola GPU determinista. Cubren identidad de ambos cuerpos, un solo débito, una colisión, Idle después de Repair y continuación desde `sourceHeld`. También cubren competencia de otro dueño estructural y disposición durante Stop24 y kind2. Antes del ajuste, la autoridad rechazaba el caso antes de Stop24. Con la autoridad corregida y el WASM anterior, Repair se adquiría y la tangencia lejana impedía la continuación. La selección dirigida de integración pasó 11 pruebas.

El build de producto con dibujo remoto terminó en 48,66 s. En la selección ampliada de 117 archivos pasaron 1.821 de 1.825 pruebas. El fallo de fin de contrato de un segundo trabajador se reprodujo con el WASM anterior y el actual, con los módulos JavaScript de la base. Reaparecieron dos fallos de `releaseCommand` en recuperación histórica y se detuvo el archivo de timeline al bloquearse en la negociación visual. Los controles de esta entrega pasaron. [Antecedentes de recuperación histórica](native-retained-host-20261119.md).

## Investigación aplicada

- DetourCrowd conserva el agente, invalida la petición anterior y contrasta la nueva ruta con el corredor actual. Wild Guardians aplica ese patrón al rehacer la ruta desde el cuerpo y la pose certificados por Stop24. [Recast/Detour 1.6.0](https://github.com/recastnavigation/recastnavigation/blob/v1.6.0/DetourCrowd/Source/DetourCrowd.cpp#L547-L791).
- El cargador glTF de Babylon prepara los recursos antes de activar la escena y vuelve a comprobar el dueño tras esperas. Wild Guardians revalida Repair antes de kind2 y comprueba que una parada ya adquirida conserve su propio camino de continuación. [Babylon.js 8.0.0](https://github.com/BabylonJS/Babylon.js/blob/8.0.0/packages/dev/loaders/src/glTF/2.0/glTFLoader.ts#L300-L506).

## Validación en NVIDIA

Con el Worker de producto, el cuerpo 2 avanzó de z=9,58 a z=9,21 durante los 367,7 ms de espera de Stop24, con 11 dibujos. El ticket 10 conservó la pose (-14, 9,152) durante los 620,3 ms de espera de kind2. En esos 18 dibujos los contadores de creación de buffers, texturas, bindings y pipelines permanecieron iguales. El ticket 13 incorporó la colisión, restauró de 0 a 100 HP y descontó 10 monedas una sola vez. El primer dibujo usó 50 ms de edad local y se dibujaron ambos pares de la curva de Repair.

El tercer READY se retuvo 254,8 ms y hubo siete dibujos con la misma pose detenida. Después, el ticket 15 dibujó la ruta de Farm sobre el cuerpo 2, que rodeó el muro por x=-16 y avanzó hasta z=7,804. El reparador volvió a Idle sobre el cuerpo 1. Las raíces de ambos actores y de la pared conservaron su identidad. Se conservaron 790 buffers entre 915 vínculos residentes comparables y los cuatro buffers exclusivos de la ruina se retiraron una vez cada uno. El drenaje terminó sin errores. [Recibo físico](performance/native-ruined-wall-active-farm-20261123.json).

El mayor intervalo entre envíos fue de 46,6 ms durante la continuación de Farm, con 4,4 ms de trabajo registrado en el Host. Se observaron además 41,0 y 38,5 ms antes de Repair. La pantalla estaba a 30 Hz y la fuente de esos intervalos sigue abierta. Quedan C4, Repair con consumidores de otras familias, la restauración de la curva sólida en curso y el guardado con Farm activo. [Análisis de cadencia](native-repair-farm-cadence-audit-20261123.md).
