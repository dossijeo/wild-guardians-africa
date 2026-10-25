# Comparativa con los mockups de carga

Las laminas `day-three-way.png` y `night-three-way.png` muestran referencia del usuario, render anterior y nuevo ajuste. Los JPEG son los adjuntos originales del mensaje de referencias, recuperados de este hilo, sin regeneracion. Se mantiene su aspecto original: la referencia diurna es mas panoramica. No se estiran ni se comparan sus pixeles como escenas equivalentes.

## Diferencias observadas y ajustes

1. **Rayos:** antes eran cuatro bandas estrechas. Ahora cuatro perfiles gaussianos solapados forman un haz difuso, con menos separacion y bordes suaves. La referencia conserva alguna estria tenue; el ajuste aun puede recuperar algo de esa modulacion sin volver a las bandas.
2. **Suelo diurno:** antes tenia una luminosidad casi uniforme. Ahora el relleno del suelo baja y el haz aporta luz localizada. En dos rectangulos fijos de suelo, la relacion de luminancia de pantalla centro/lateral pasa de 1.03 a 1.40; el lateral baja aproximadamente 32%. No es una medida fotometrica.
3. **Noche:** se reduce el relleno fuera del haz y se concentra luz en plantas y suelo. La relacion de los mismos rectangulos pasa de 1.70 a 5.74. El fondo de referencia sigue siendo mas azul y luminoso, sin que esto obligue a aclarar el suelo.
4. **Sombras:** la contribucion del haz reutiliza la visibilidad de sombras que ya calcula cada material, sin repetir consultas de textura. La luz direccional se alinea con la direccion de pantalla del haz; la normal usa la misma direccion. Se verifica la proyeccion de punta a sombra en seis poses, con producto escalar 1 respecto a la direccion opuesta al rayo. El antiguo sol no decide ya la direccion en esta variante.
5. **Isla/bruma:** se acorta la transicion del borde del suelo y se conserva bruma exterior. Su radio minimo aumenta por evento al plantar para no quitar tierra bajo plantas nuevas. La isla de referencia es mas elevada y el fondo tiene una mesa central mas dominante: esto aun no esta igualado.
6. **Estrellas:** se agregan puntos tenues deterministas en la pasada existente de bruma. La referencia tiene mas variedad de escala y resplandor. El patron de esta prueba esta anclado a pantalla; no es una solucion global para el cielo del juego.
7. **Plantas/UI:** las referencias tienen un maiz mas verde y siluetas diferentes. Se conservan los modelos originales, su escala y el zoom fijo. La madera y las flores actuales son mas saturadas que la referencia; la version nocturna de referencia no lleva girasoles. Estas diferencias siguen pendientes, no se declara equivalencia completa.

## Evidencia y limites

Ocho capturas reales 1280x720/390x844, dia/noche, con cuatro plantas, semilla 712 y progreso .75. Camara y geometria identicas dentro de cada pareja. 6 draws y 16002 triangulos con sombra en cache; cero errores GL/JS. Esos contadores no prueban coste GPU constante: hay mas aritmetica de fragmento. Al girar, orientar la luz con el haz invalida la cache de sombras, por lo que falta medir ese caso.

Los perfiles de luz son artisticos proyectados, no un volumen fisico con oclusion. La iluminacion respeta las sombras existentes, pero no hay dispersion volumetrica ni bloqueo de rayos por hojas en el aire. El cielo y el fondo todavia usan las variantes QA previas. No se ha integrado esta variante en produccion ni en main.

Reproducir: `node tools/experiments/capture-loading-diffuse-contrast-20261022.mjs`; despues `python tools/experiments/package-loading-mockup-comparison-20261022.py`. Vite debe servir el worktree en puerto 5190. Auditoria de direccion en `../loading-diffuse-contrast-20261022/direction-audit.json`.
