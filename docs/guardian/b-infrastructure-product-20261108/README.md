# Cierre de infraestructura de B — 8 de noviembre de 2026

Este cierre permite migrar contenidos sobre los propietarios existentes. No certifica toda la paridad visual de B, campañas prolongadas ni una mejora de rendimiento global.

## Cambios

1. Perfil de producto único: recuperación histórica, eventos interiores e impostores lejanos se habilitan por defecto al seleccionar WebGPU, tanto en la autoridad preparada como en la presentación. Las reversiones son explícitas y se validan sus dependencias.
2. Física: certificado v2 para varios cuerpos aislados, filtrado de muestras por actor, revisión de todos los cuerpos contra puertas y terreno, instalación atómica y reversión si falla un participante. Los cuerpos interactuantes y transiciones no certificadas siguen la vía confirmada ordinaria.
3. VFX: se elimina iluminación de escena redundante en materiales con output TSL propio. La traza identificó también las cintas del vórtice del guardián; no se añadieron normales falsas.
4. Corrección encontrada al endurecer la QA: el umbral preventivo del diario no invalida una frontera íntegra dentro de la capacidad real. La activación observa progreso y conserva los límites de inactividad y duración total, en lugar de abandonar por plazos gráficos de 8–20 segundos. La fase de activación puede renovar checkpoints por el canal nuevo mientras drena los comandos ya aceptados; el replay permanece congelado.

La [compilación de producción WebGPU](build.txt) pasa después de todos los cambios; mantiene el aviso de chunks grandes existente.

## Pruebas reproducibles

- [Batería de contratos](contracts.tap): 299 pruebas, cero fallos. Incluye el perfil, aislamiento, muestras, gates, transporte, eventos, terreno y VFX.
- [Recuperación dirigida](recovery-contracts.tap): 49 pruebas, cero fallos, después de la corrección del relevo. Incluye nuevos casos del umbral preventivo y activación por encima de los plazos antiguos.
- [Recuperación ampliada](recovery-expanded.tap): 63 pruebas, cero fallos; reintento, host, visibilidad, superficie, diario y consultas lejanas. Las baterías comparten algunas pruebas; no sumar sus cifras como pruebas únicas.
- [Attack real](attack.json), [captura](attack.png) e [informe completo comprimido](attack-full.json.gz): manglares con islotes nativos, cinco especies, backend WebGPU hardware. El impacto entra por el ID del objetivo a través de la acción normal y su autoridad. Se observan 78 huesos, error 0, dos inicios, cuatro cambios de muestra y una finalización histórica. No es prueba de selección por píxel ni de todo el ciclo hasta levantarse.

El arranque del servidor utiliza únicamente VITE_PRESENTATION_BACKEND=webgpu-worker, sin activar individualmente las tres opciones nuevas. Las URLs QA seleccionan fixtures e instrumentación. El servidor de esta ejecución desactiva HMR para que las ediciones no reinicien una partida durante la prueba.

Los comandos gráficos son:

```powershell
$env:QA_BASE_URL='http://127.0.0.1:5202'
$env:QA_INPUT_MODE='id'
$env:QA_TIMEOUT_MS='900000'
$env:QA_OUTPUT='.cache/b-infrastructure-rapier-isolated'
node tools/experiments/audit_webgpu_historical_rapier.mjs

$env:QA_URL='http://127.0.0.1:5202/?qa-worker-game&qa-worker-raid&qa-webgpu-world&qa-webgpu-recovery&qa-webgpu-all-actors&qa-seed=712&wildEngineThreads=0'
$env:QA_OUT='.cache/b-infrastructure-recovery-verified'
node tools/experiments/audit_integrated_device_recovery.mjs
```

Playwright debe estar disponible; PLAYWRIGHT_MODULE admite su ubicación externa (directorio para Attack, index.mjs para recuperación). Se usó Edge y la GTX 1660 del equipo. No se desactivó la verificación del adaptador hardware.

La [prueba de renovación durante activación](activation-renewal.tap) pasa junto con las otras pruebas del host (8 pruebas). Usa autoridad real, encola 70 comandos durante la pérdida, exige un nuevo checkpoint y comprueba el orden de la pausa y reanudación final. El [estado bloqueado anterior a esta corrección](activation-stall-before-renewal-fix.json) conserva el diario en 128 entradas y la cola gráfica vacía.

Las pruebas de [tráfico de interfaz](ui-fence.tap) pasan 32 casos; [ACK diferido y autoguardado](handoff-autosave.tap), 25. Durante el relevo, tutorial y consultas de cámara esperan a la nueva superficie; la cámara local sigue disponible. El autoguardado conserva sus eventos pendientes y se reanuda una vez publicada la superficie. La activación espera además a que se confirme cualquier candidato de checkpoint restante.

La [traza del callback de voz](voice-completion-diagnosis.json) identificó un cierre de mechanic.first-raid y un snapshot enviados desde onVoiceEnded durante el bloqueo. El puente conserva el cierre automático por identidad, lo entrega después de los intervalos de lectura pendientes y deja que la autoridad descarte mensajes obsoletos. Solo una confirmación positiva solicita persistencia, usando el mismo controlador suspendible que los autoguardados de eventos. Las [40 pruebas dirigidas](voice-recovery.tap) cubren esta carrera, duplicados, mensajes obsoletos y eliminación del mundo.

## Recuperación integrada verificada

[Resultado resumido](recovery.json), [informe completo](recovery-full.json.gz), [antes](recovery-before.png) y [después](recovery-after.png). La pérdida se provoca con GPUDevice.destroy en la partida normal, sin fallback WebGL. Adaptador NVIDIA Turing no fallback; CDP identifica la GTX 1660. La superficie previa estaba en la secuencia 92; la nueva reproduce la base y el diario, renueva checkpoints durante activación y alcanza la secuencia 412 antes de la captura final. La autoridad llega a 503. El coordinador termina en idle, sin bloqueo de entrada ni suspensión del reloj; no hay errores de interfaz ni excepciones de página.

La captura posterior se inspeccionó: mundo e interfaz visibles. Conserva las diferencias de iluminación/materiales que debe resolver contenido; no se certifica paridad visual. La consola registra la pérdida de dispositivo provocada y dos respuestas HTTP 404 sin URL en esta captura de logs. Una repetición con captura de respuestas de la página tampoco atribuyó esas dos peticiones: la consola sigue registrándolas, pero no aparecen en las respuestas de la página. La captura actual no cubre todas las peticiones de Workers dedicados; su origen sigue sin identificar. No se presentan como una mejora de rendimiento ni como validación completa de recursos.

El [fallo intermedio del inspector QA](handoff-inspection-race.json) fue una lectura de sequence cuando la superficie todavía no tenía state durante el relevo. El runner espera ahora su disponibilidad; no se ocultaron errores del producto.

## Intentos incompletos y límites

Se conservan el [diagnóstico de normales](missing-normal-diagnosis.json), los [intentos incompletos](incomplete-attempts.json) y el [fallo real anterior a la corrección](recovery-failure-before-fix.json). La primera prueba de recuperación terminaba demasiado pronto: ver avanzar la autoridad no demuestra que la superficie esté publicada ni que las interacciones estén desbloqueadas. El runner ahora exige ambas condiciones y una publicación posterior.

Una ejecución simultánea de escenarios gráficos y comprobaciones de build/contratos agotó el plazo al drenar ticks de pausa. Se repitió Attack aisladamente. Estos ensayos son funcionales; no proporcionan comparaciones fiables de frametime.

La captura de Attack conserva siluetas de animales oscuras, presentes también en la evidencia anterior. La paridad artística sigue pendiente. El navegador emite además una advertencia de deprecación de atan2, independiente del problema de normales resuelto. La reproducción multi-cuerpo y el rollback se prueban por contratos; la captura gráfica contiene un solo impacto.

Consultar [propiedad de infraestructura y contenido](../b-infrastructure-ownership.md) antes de añadir una ruta paralela por especie o efecto.
