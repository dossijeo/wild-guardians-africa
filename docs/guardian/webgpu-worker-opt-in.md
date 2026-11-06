# Arranque explícito de integración WebGPU Worker

El build puede seleccionar `VITE_PRESENTATION_BACKEND=webgpu-worker` para conectar la preparación del mundo, la autoridad de simulación y la presentación al camino Worker sin construir `WorldScene` ni su renderer WebGL. Sin esa variable se conserva el arranque anterior. Los parámetros `qa-*` no habilitan ni configuran esta ruta en un build de producción.

En PowerShell, para construir este perfil de integración:

```powershell
$env:VITE_PRESENTATION_BACKEND = 'webgpu-worker'
npm run build
```

El Worker gráfico comprueba `isWebGPUBackend` después de inicializar Three.js, y el cliente exige la respuesta `WebGPU` antes de conectar la partida. Si no hay WebGPU real, se comunica el fallo: este perfil no cambia silenciosamente a WebGL. El backend anterior sigue disponible en la compilación normal; todavía no existe una selección automática ni un fallback entre ambos sin reiniciar.

Para una partida nueva se usa el bootstrap espacial y de estado del Worker; para una partida guardada se utiliza su checkpoint o la reparación en Worker cuando el formato la permite. La política incluye el checkpoint de física. Un guardado incompatible falla antes de iniciar la autoridad y no se convierte a una simulación local. La pausa de visibilidad y el tutorial usan las rutas ordenadas del Worker existentes.

**Estado: integración incompleta, no producto listo.** El flujo reutilizado mantiene deshabilitados los botones que no sean inicio, cultivo, construcción y, cuando el posicionamiento autoritativo está disponible, magia. La presentación, cinemáticas, efectos, terreno, texturas, tutorial y transiciones aún requieren migración y validación integral; la locomoción GPU todavía no dispone de un horizonte futuro autorizado. El arranque usa temporalmente la presentación de carga reducida. No se ha validado este perfil en navegador ni en partidas completas, y no hay mediciones de rendimiento atribuibles al cambio. Mantener el backend anterior como predeterminado hasta cerrar esas garantías.
