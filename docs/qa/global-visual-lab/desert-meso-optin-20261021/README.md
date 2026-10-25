# Relieve mesoscópico: opción explícita del laboratorio

La candidata filtrada se incorpora como opción desactivada por defecto. URL: ?visualLab=global-lighting&sandRelief=1&sandWear=residual&sandMeso=1. sandWear=residual reproduce el desgaste de la candidata; los tres parámetros exigidos por la activación son visualLab=global-lighting, sandRelief=1 y sandMeso=1.

Implementación en global-desert-meso.js y conexión en AfricanToon, con clave de caché de shader distinta. Solo se aplica tras el material desertSand, manteniendo geometría, recursos y simulación. El resto de escenarios no recibe esta capa. Un shader incompatible falla explícitamente en el ancla.

Seis parejas reales QA frente a opción nativa: tres cámaras, día/noche, semilla 712, media, 1280×720. Imágenes exactamente iguales píxel a píxel; mismos objetivos, cámaras, horas, calls y triángulos. Sin errores capturados. audit-desert-meso-optin-20261021.py reproduce la comprobación. Las imágenes artísticas de referencia son las del pase desert-meso-filter-20261021; aquí se prueba equivalencia, no una mejora adicional.

Comprobación Node de guardas: vacío, flag aislado, falta de laboratorio, falta de sandRelief y valor 0 desactivan. La combinación explícita activa. Ancla ausente lanza error. Node --check pasa en ambos módulos. Estas comprobaciones no sustituyen validación de todas las campañas ni benchmarks.

Coste GPU, movimiento y streaming siguen pendientes. Integración exclusivamente optativa para facilitar pruebas y revisión; no promoción a valor predeterminado, ni fusión en main. Los dos ruidos siguen evaluándose antes de la atenuación. No atribuir ahorro por menor visibilidad.

Reproducir capture-desert-meso-optin-20261021.mjs y audit-desert-meso-optin-20261021.py con Vite 5190. PNG regenerables, metadatos y auditoría publicados.
