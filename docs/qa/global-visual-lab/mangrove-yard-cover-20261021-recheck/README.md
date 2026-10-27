# Manglares: intento de separar patio y corredores, no aplicado

Dos capturas de seis parejas, incluida repetición con observación explícita de settlementSite, no modificaron instancias ni apariencia. La propiedad nav.field.c.settlementSite resulta undefined en esta escena nativa y por ello no aparece serializada en captures.json. El helper dependía de ella y omitía silenciosamente el ajuste. Resultado inválido para evaluar la hipótesis artística; no demuestra que separar máscaras sea ineficaz.

El helper ahora falla explícitamente si falta esa información. Las capturas guardadas corresponden a la versión anterior a esa comprobación; reproducir con el helper actual debe detenerse con error explicativo hasta resolver la fuente de datos. No integrado en V10.

La máscara residente de los chunks contiene desgaste aunque el objeto JS consultado no exponga el sitio. La atribución anterior a groundWear417 describe el código JS, pero debe verificarse también en la ruta nativa antes de reconstruir corredores. Próximo paso: localizar metadatos autoritativos o exportación visual de componentes de desgaste, evitando consultas por fotograma y cambios de simulación.

Preservados los resultados para trazabilidad; no mejora visual ni rendimiento demostrado. El objetivo global permanece activo.
