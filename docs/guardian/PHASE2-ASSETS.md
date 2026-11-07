# Procedencia de recursos de la fase 2

No se descargaron ni incorporaron assets de terceros nuevos. Por tanto no hay nuevas licencias CC0 que verificar ni paquetes externos añadidos.

| Recurso | Procedencia y autoría | Modificación | Motivo |
|---|---|---|---|
| guardian.blend / guardian.glb | Modelo original proporcionado por el usuario, preservado en art/guardian/original.glb | Pesos de hombro, cuatro clips, mayor viento | Mantener identidad y permitir lanzamiento desde manos |
| Icono Attack en native-hud.js | SVG dibujado para este cambio | Rayo dorado en marco del menú existente | Legibilidad y coherencia sin paquete de iconos |
| Haces, núcleo y anillo | Geometrías Three.js definidas en guardian-summons.js | Reutilización e instanciado | Conectar mano y contacto con pocos draw calls |
| Aura de materialización | VfxLibrary y preset repel ya presentes en el repositorio | Densidad 0,35, escala 0,65, sin luces locales ni captura de profundidad adicional | Reutilizar atlas y sistema existente |
| Daño, retirada y aparición | Banco de audio existente del proyecto | Asociación a eventos, ganancia y atenuación; sin editar audios | Diferenciar especies y evitar nuevos recursos |

La conservación del modelo y de los recursos existentes no constituye una nueva afirmación de licencia CC0 sobre ellos. No se ha cambiado su procedencia ni licencia.
