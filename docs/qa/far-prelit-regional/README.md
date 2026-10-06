# Atlas precocinado y sustitución de región procedural

Prototipo aislado de Sabana, semilla712, population=procedural&lighting=real&prelit=rotations&haze=1&resolution=128&views=16. No integración en gameplay ni todos los biomas.

Se añade diagnóstico de correspondencia al reemplazar regiones: IDs compartidos y comparación exacta de posición, rotación, escala uniforme/anisotrópica y origen del modelo. Se ejecuta solo al sustituir región, fuera del render por frame. No garantiza equivalencia visual con las instancias del juego real.

Nativo1280×720: región0:0 contiene131 árboles, diez modelos cercanos; proxy de suelo480×480, paso4,14641 vértices/28800triángulos. Consulta worker509.3ms,30 frames durante espera, máximo intervalo33.3ms. Estos datos no acreditan fluidez móvil ni coste total de cambio.

Desplazamiento de foco a96:96 conserva región anterior durante solicitud. Nueva población123:66 compartidos, cero cambios de transformaciones,57 añadidos y65 retirados. Tras reemplazo conserva16 vistas precocinadas, densidad decreciente activada y cambio a noche. Nueva región sin pending; GL0/errors[], consola vacía. Capturas inicial, desplazada y noche adjuntas. Diferencia aproximada terreno/altura de base: máximo0.088m inicial y0.086m al desplazar. No agua, terreno detallado ni backdrop.

13 pruebas pasan(716.46ms): correspondencia regional contra datos nativos completos, anclaje, tracker y cancelación. La prueba nueva compara toda la instancia compartida mediante deepEqual y detecta perturbaciones de cada eje/yaw/escala/origen. Test de regenerar región inicial conserva todos los IDs y parámetros.

Pendientes: libertad continua de cámara y elevación, aceptación de crossfade y color, supresiones/ID/readiness de chunks reales, campo lejano/backdrop, coste y RAM móvil. Ocho vistas siguen defecto; dieciséis opcional. No se declara listo el horizonte definitivo.
