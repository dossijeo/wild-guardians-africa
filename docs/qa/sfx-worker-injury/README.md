# SFX 123 — Aviso de trabajador lesionado

`game_farmer_hurt` sigue exclusivamente el evento real `WorkerIncapacitated` del segundo encuentro dañino. Es un aviso de UI de prioridad 3, separado de los sonidos físicos del NPC y de la bestia. No cambia golpes, RNG, recuperación, saldo, animación ni navegación. El primer golpe o el movimiento de caída no generan este aviso.

Los eventos nuevos de un mismo procesamiento se agrupan en un aviso. Se conserva la deduplicación por ID y el silencio del historial restaurado. La admisión general limita voces/emisores; el aviso pertenece a `worker-danger`. No hay un nuevo cooldown de gameplay ni se afirma agrupación por incursión completa. La decodificación pendiente caduca tras medio segundo o se invalida al ocultar, salir o abrir una pausa bloqueante.

68 pruebas dirigidas correctas, incluidas tres específicas de lesión: agrupación sin mutación, primer golpe sin aviso y decodificación tardía/pausa/salida. Las veinte combinaciones especie/perfil del dominio comprueban los dos contactos, recuperación al siguiente día, cupo consumido exactamente dos veces y silencio al restaurar. El conjunto ampliado de 33 archivos de audio/SFX/música/Opus pasa 414 pruebas.

Prueba Web Audio nativa: veinte casos de cinco animales y cuatro perfiles realmente contratados; centro, semilla, jornal y muro pagados desde 1500 monedas. Dos fronteras físicas de encuentro preparadas explícitamente con navegación plana sin obstáculos. Cada segundo contacto produce un aviso de lesión; veinte avisos aceptados, muestras a velocidad 1, bus UI, familia correcta, cero voces al cerrar cada caso y contexto final cerrado. Se utilizan los alias de audio comprimido. La salida está silenciada y preparada antes del encuentro: no acredita escucha, mundo 3D completo ni latencia de descarga fría.

`tests/browser/committed-event-audio.html` ahora reutiliza el doble de navegación actual, que incluye el contrato `forBuildingPlacement`. Su primera ejecución detectó el doble antiguo incompatible; la ejecución corregida termina veinte casos. No se cambia la navegación de producción para acomodar el test.

Compilación y paquete correctos: 586 archivos, 388.055.382 bytes, 859 referencias relativas, veinte GLB runtime. La matriz de los 126 SFX y los hashes originales está regenerada: 83 asignados, 43 pendientes. El catálogo completo todavía necesita revisar contextos, alternativas y escucha; esta integración no lo declara terminado.

Reproducción: Vite `/tests/browser/committed-event-audio.html`, «Probar obras y contactos». `native.json` y `native.png` conservan el resultado final. Esta ruta aislada no modifica ninguna partida guardada.
