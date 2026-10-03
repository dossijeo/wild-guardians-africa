# Previsualización y confirmación de magias

Implementación `9b4dfc5`, sección 14 del Plan Maestro. El primer toque propone
una zona; otro toque mueve el área y «Activar poder» confirma. Cancelar, Escape,
cerrar el panel o cambiar de herramienta retiran la propuesta. Solo una
confirmación legal crea la magia y empieza su recarga. El borrador no se guarda
como un poder activo ni altera economía, RNG, eventos, plantas o navegación.

Preview y lanzamiento comparten validación de desbloqueo, recarga, terreno,
intersección de áreas, animales en el Escudo y permisos. Confirmar vuelve a
validar para cubrir cambios de día/noche, incursión, pausas o trabajadores
mientras se apunta. Repetir un comando ya confirmado no reinicia duración,
recarga ni eventos.

El borde exterior tiene el radio lógico exacto; una banda de 14 cm se extiende
hacia dentro y sigue las alturas de los triángulos del suelo. Se dibuja sobre
vegetación y props para conservar su legibilidad, sin escribir profundidad,
proyectar sombra ni convertirse en obstáculo. Las coordenadas del buffer son
locales al centro, compatibles con el origen relativo de la escena.

## Evidencia

[42 pruebas dirigidas](qa/spell-preview/directed.txt), cero fallos/omisiones:
apuntar y cancelar los tres poderes conserva el estado completo; nueve pares
de áreas comprueban intersección y separación; terreno/coordenadas inválidas,
centros, desbloqueos, pausas y permisos bloquean. Multiplicar exige trabajadores
disponibles y paz diurna. Los relojes avanzan a ×1 de día y ×5 de noche;
pausas apiladas y snapshots mantienen duración y recargas independientes.
El test de Escudo comprueba penetración geométrica sin mover al animal; no
sustituye una inspección con todas las especies, poses y rutas reales.

[Build y paquete web](qa/spell-preview/build.txt): 554 archivos, 379689359 bytes,
794 enlaces relativos, 20 GLB runtime sin originales duplicados.

Navegador: juego y HUD de producción, Sabana/Mapungubwe, semilla 712, origen
QA separado en 5178. Centro, mijo y trabajador pagados. La fixture adelanta al
día 5 y acredita explícitamente 200 monedas para inspección; no representa una
campaña natural. No se toca el origen del usuario en 5173.

- [Apuntar](qa/spell-preview/preview-es.png) y [mover](qa/spell-preview/moved-es.png)
  Crecimiento mantienen saldo 295; no aparece su VFX.
- [Cancelar](qa/spell-preview/cancelled-es.txt) deja Crecimiento listo, sin
  número de recarga. [Confirmar](qa/spell-preview/activated-es.txt) muestra
  recarga 90 y conserva el saldo.
- [Escudo sobre Crecimiento activo](qa/spell-preview/overlap-es.png) muestra
  borde rojo, explicación y confirmación deshabilitada. Escape retira el borrador.
- [Inglés](qa/spell-preview/preview-en.png) conserva el flujo y traduce los
  textos nuevos; Español se comprueba en las capturas anteriores.

La [consola](qa/spell-preview/console.json) no contiene errores. Registra ocho
warnings de ANGLE sobre `f_environment4` potencialmente sin inicializar en
shaders del mundo; no se atribuyen al material Basic del borde ni se consideran
resueltos. La compilación de los programas terminó y la partida siguió funcionando.
Pestaña de QA y servidor cerrados tras la inspección.

El [CI exacto de 9b4dfc5](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37109456784)
terminó correctamente: 780/780 pruebas, cero fallos, 224895,068173 ms,
verificaciones, compilación, ZIP y artefactos. [Log completo](qa/spell-preview/ci-log.txt).
La continuación física del Escudo se corrigió después:
[evidencia y alcance](qa-shield-expiry.md). El resto de la auditoría funcional
del Plan Maestro sigue abierto.
