# Profundidad y PCF originales del terreno

`tools/prepare_native_shadow.py` extrae `filteredShadow4` del Bioma Lab V4.0
con hash de su cuerpo original. Se conservan nueve muestras, separación de
1,15 texels, pendiente limitada a ±4, bias mínimo 0,00017 y dependiente del
normal de 0,0004, compensación de pendiente 0,65 y fade de borde 0,005–0,045.
La función recibe posición mundial y la VP de la luz del juego. La prueba
revierte los cambios de nombres y de integración y compara el cuerpo fuente.

La adaptación evalúa las derivadas antes del retorno por borde de mapa y antes
de la rama de visibilidad de cada luz. Conserva el cálculo de las muestras
válidas y evita derivadas indefinidas en quads que cruzan una condición. Las
consultas usan LOD explícito cero: la profundidad no tiene mipmaps. Estas
adaptaciones responden a avisos reales del compilador ANGLE en Windows.

El mapa usa una `DepthTexture` DEPTH_COMPONENT24/UNSIGNED_INT y comparación
LEQUAL con filtro lineal, equivalente al sampler de PCF del lab. El attachment
de color de Three se conserva en la misma pasada para la lectura de profundidad
codificada que utiliza DEST; no se duplica la pasada geométrica. La proyección,
resoluciones y foco siguen la revisión de [cámara de sombras](qa-shadow-camera.md).
Cada draw de profundidad usa polygon offset (1,1), incluidos materiales custom;
el adaptador restaura todos los parámetros y el método de draw aun si falla.

Terreno, props, poblado, trabajadores, bestias, cultivos y muros Standard
comparten el sampler; el término de iluminación directa y la gradación cel
consultan la misma visibilidad. El agua conserva su rama pintada y su peso
original de sombra. DEST conserva su filtro específico, cortes, sampler de
color y profundidad custom. El menú tiene un renderer independiente.

La calidad mínima no necesita un mapa completo. Sin attachment, un sampler
activo requiere una textura de profundidad válida incluso si su rama está
desactivada: el placeholder RGBA de Three causó INVALID_OPERATION en la prueba
real. Ahora comparte una reserva de profundidad 1×1 marcada para upload y
liberada al cerrar. Agua independiente posee y libera su propia reserva.
Cambiar resolución libera el target anterior y recrea ambos attachments;
pasadas desactivadas o una luz sin actualización no asignan un target nuevo.

## Verificación

- Siete pruebas nuevas: cuerpo fuente, formato/filtros, resizing, polygon offset
  con fallo, reserva y flags de actualización, composición con Standard y agua.
  Las pruebas existentes de materiales se actualizan al contrato de PCF nativo.
- Regresión final 585/585 sin fallos ni omisiones en 318,232 s, incluidos los
  ajustes de derivadas, reserva y actualización por luz. Las dirigidas finales
  pasan 22/22 en 0,916 s. GitHub Actions verificará la versión publicada.
- Build final 7,82 s y paquete de 548 archivos / 379.421.724 bytes, 791 enlaces
  relativos y 20 GLB de runtime, sin duplicados originales.
- La comparación inicial de Sabana con reloj y cámara fijos, bajo el HUD,
  registra 157.830 píxeles distintos de 396.800 al desactivar sombras, máximo
  75 por canal. Acredita efecto visual; no compara dos implementaciones de PCF
  ni sustituye una comparación con el framebuffer original del lab.
- Evidencia GPU y capturas en `test-results/native-pcf-*`: seis biomas con
  Mapungubwe, personajes a escala nativa, DEST, agua, noche y resolución.
  El registro final distingue los ajustes posteriores a la primera comparación.
- La compilación final de Sabana y Gran Río no registra avisos; Manglares aún
  registra X3595 de ANGLE (derivadas en un bucle). No se atribuye ese aviso a una
  causa no demostrada ni se acredita compilación sin avisos en toda la matriz.
  La revisión de ese aviso sigue pendiente, aunque los frames no tienen errores GL.

La revisión no introduce todavía `shadowDirty` para evitar pasadas estáticas:
se conserva la actualización de Three, necesaria para actores y destrucción.
Tampoco acredita FPS, memoria GPU medida, todos los dispositivos móviles o la
matriz de treinta combinaciones. Origen flotante y las demás puertas del Plan
Maestro siguen pendientes.
