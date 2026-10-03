# Auditoría conservadora de caras de props

3 de octubre de 2026. Se auditaron los binarios usados por el juego: seis biomas,
120 props, 360 LOD. [Informe reproducible](qa/face-sides/topology.json), con hashes
del binario y atlas por bioma. Ejecutar desde la raíz:

```powershell
node tools/audit_face_sides.mjs docs/qa/face-sides/topology.json
node --test tests/mesh-sidedness.test.js
```

El análisis une posiciones exactamente iguales para atravesar costuras de UV y
normales, sin cerrar huecos por tolerancia. Exige dos triángulos con orientación
opuesta por arista, ausencia de triángulos degenerados y volumen firmado positivo
en cada componente conectado. Es un criterio conservador: rechazar una malla no
demuestra que necesite DoubleSide. Intersecciones o contactos entre sólidos pueden
rechazarse aunque no ocasionen un defecto visible. El volumen de una superficie
abierta tampoco acredita su orientación exterior.

Los seis atlas de color son completamente opacos. Sólo cuatro LOD superan el
criterio; ningún prop lo supera en sus tres LOD, ni en el LOD final usado para sus
sombras sólidas. Por ejemplo, los huesos de sabana superan el nivel inicial, pero
su último nivel tiene 24 aristas abiertas y 33 con más de dos triángulos. Los huesos
de cañones superan los dos primeros niveles; el último tiene 12 aristas abiertas,
20 con más de dos triángulos y una con orientación incompatible.

Por tanto, **no se cambió el material de producción**. El material de color es
compartido entre LOD y el pase de sombras sustituye éste por un material sólido
DoubleSide independiente. Cambiar sólo el color no mide el cambio de sus sombras.
Una futura prueba puede aislar un prop/LOD o examinar sus defectos concretos antes
de autorizar FrontSide. Deberá comparar ambos pases, vueltas de cámara e imágenes,
incluido el acercamiento durante el fade de ocultación. No hay benchmark GPU de
caras ni una mejora de FPS atribuible a este informe.

Las cuatro pruebas del analizador pasan: costuras de cubo y transformación,
superficies abiertas/invertidas/duplicadas/degeneradas, componente invertido
oculto por volumen agregado positivo y huecos pequeños/entradas inválidas.
No modifica geometría, recetas del lab ni juego; no acredita cultivos, poblados,
centros dañados o personajes. La CI anterior de main (7241dc9) terminó correctamente.
