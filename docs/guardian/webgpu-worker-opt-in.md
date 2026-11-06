# Arranque explícito de integración WebGPU Worker

El build puede seleccionar `VITE_PRESENTATION_BACKEND=webgpu-worker` para conectar la preparación del mundo, la autoridad de simulación y la presentación al camino Worker sin construir `WorldScene` ni su renderer WebGL. Sin esa variable se conserva el arranque anterior. Los parámetros `qa-*` no habilitan ni configuran esta ruta en un build de producción.

En PowerShell, para construir este perfil de integración:

```powershell
$env:VITE_PRESENTATION_BACKEND = 'webgpu-worker'
npm run build
```

Antes de crear cualquier mundo, el perfil comprueba la presencia de Worker, OffscreenCanvas y un adaptador WebGPU. Si esa comprobación falla o agota el plazo, se avisa y se selecciona WebGL para esa partida; no se crean ambos mundos. El adaptador no garantiza que pueda adquirirse el dispositivo o utilizar WebGPU en el Worker: si alguna de esas operaciones falla más tarde, se comunica el error y no se cambia silenciosamente de renderer. El Worker gráfico comprueba `isWebGPUBackend` y el cliente exige la respuesta `WebGPU`. El fallback previo no garantiza la apertura de guardados con un checkpoint de física exclusivamente Worker: esos guardados mantienen su validación y pueden rechazarse explícitamente en la ruta heredada.

Para una partida nueva se usa el bootstrap espacial y de estado del Worker; para una partida guardada se utiliza su checkpoint o la reparación en Worker cuando el formato la permite. La política incluye el checkpoint de física. Un guardado incompatible falla antes de iniciar la autoridad y no se convierte a una simulación local. La pausa de visibilidad y el tutorial usan las rutas ordenadas del Worker existentes.

Al iniciar una partida Worker se solicita también un guardado inicial, como en el flujo anterior. La solicitud entra en la cola autoritativa antes de que la interfaz pueda iniciar una cinemática y no se espera desde el bucle de presentación; la escritura sigue el coordinador de checkpoints y sus errores se comunican. Una prueba verifica el orden con un runtime simulado; falta comprobar el guardado y la restauración completos en navegador.

El HUD reutiliza `GameJuice` para recibir eventos confirmados, importes, confirmaciones de guardado y overlays, y vuelve a solicitar la música de partida. Los indicadores situados sobre el mundo usan la copia de terreno confirmada de la cámara y se ocultan temporalmente si falta esa muestra. El temblor de cámara que `GameJuice` aplica alrededor del dibujo WebGL todavía no está conectado al Worker gráfico; el resto de efectos de HUD siguen siendo elementos 2D. Falta validar el audio, los overlays y la sincronización en una partida real.

**Estado: integración incompleta, no producto listo.** El flujo reutilizado mantiene deshabilitados los botones que no sean inicio, cultivo, construcción y, cuando el posicionamiento autoritativo está disponible, magia. La presentación, cinemáticas, efectos, terreno, texturas, tutorial y transiciones aún requieren migración y validación integral; la locomoción GPU todavía no dispone de un horizonte futuro autorizado. El arranque usa temporalmente la presentación de carga reducida. No se ha validado este perfil en navegador ni en partidas completas, y no hay mediciones de rendimiento atribuibles al cambio. Mantener el backend anterior como predeterminado hasta cerrar esas garantías.
