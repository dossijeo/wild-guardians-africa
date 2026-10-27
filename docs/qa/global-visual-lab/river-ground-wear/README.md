# Gran Río: desgaste coordinado sin material de tierra

**Descartar esta implementación.** Reducir el material herbáceo en el mismo rango aproximado que la geometría descubre un color base casi uniforme. El poblado y los corredores quedan como manchas pintadas, de día y noche. La coordinación de máscaras necesita una capa de tierra con detalle propio; no basta con adelantar la desaparición de Grass Medium 01.

[Diurna media](gran-rio-media-day-pair.webp) · [Nocturna media](gran-rio-media-night-pair.webp) · [Diurna baja](gran-rio-baja-day-pair.webp) · [Nocturna baja](gran-rio-baja-night-pair.webp)

Izquierda: receta previa con paleta candidata y desgaste de geometría retenido. Derecha: el factor de cobertura de suelo `1-wear*.91` se sustituye, solo para Gran Río, por `1-smoothstep(.08,.30,wear)`. La intensidad de parallax también usa ese factor. La mezcla existente propaga la cobertura a color, normales, rugosidad y AO. No se altera la distribución ni las alturas de las hojas. No es una comparación contra main.

## Resultado y explicación

En `groundMaterial417`, el color final mezcla `original` con la textura mediante `amount`; las normales y AO del material también se atenúan con `amount`. Al llevarlo a cero no aparece otra textura de tierra. Queda el color previo sin el detalle del recurso. El resultado observado confirma que retirar la hierba texturizada requiere sustituir su función visual en las zonas despejadas.

La máscara del suelo no reproduce exactamente la huella dilatada de la geometría: usa desgaste central y pendiente, mientras las hojas comprueban ocho vecinos, además de humedad, cobertura y obstáculos. Esta prueba no acredita una correspondencia completa entre soportes. No extender hierba sobre caminos para disimular el problema.

## Evidencia y alcance

24 capturas reales, 12 parejas: Gran Río semilla 712, 1280×720, baja/media, día 150/noche 350, tres poses. Auditoría aprobada de cámara, objetivo, hora, llamadas, triángulos, instancias y buffers iguales; sin errores registrados ni overflow. Se inspeccionaron normal baja diurna y pares normales media día/noche. [Trazas](captures.json), [contadores y diferencias](comparison.json).

Sin benchmark temporal: la variante falla claramente la puerta artística. El shader añade dos smoothstep sin nuevas texturas, geometría o pasadas, pero el cambio de máscara puede reducir muestras POM; no afirmar igualdad de coste ni aceleración. No se ha validado movimiento.

## Próximo paso concreto

Probar una capa de tierra reutilizable bajo la cubierta, empezando por el recurso existente Ground079S del repositorio, con color, escala, normales y licencia revisados antes de usarlo en Gran Río. Mantener Grass Medium 01 para áreas herbáceas y distancia; mezclar tierra y fibras con la máscara de desgaste. Medir las muestras y memoria adicionales si la propuesta supera la evaluación visual. No volver a alterar la luz para compensar la ausencia de material de suelo.

## Reproducción

```powershell
node tools/experiments/capture-river-ground-wear.mjs
python tools/experiments/package-river-ground-wear.py
```

Vite 5190. PNG originales locales; cuatro pares, registros y herramientas publicados. Solo interceptación QA; comportamiento predeterminado, modelos y simulación intactos. Calidad global aún pendiente.
