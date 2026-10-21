# Sabana: normales base coherentes con LOD

Control: candidata de viento atenuado por lod. Nueva candidata: además interpola normales refinadas hacia las del módulo light con el mismo lod18–24. Lee modules.json sin modificarlo y construye atributo flatNormal al crear geometrías. Usa uv.y*12 para identificar hoja; primeras8 corresponden a light,las4 adicionales colapsan como antes. Ninguna nueva instancia,triángulo,textura o pasada.1296 bytes nominales de atributos adicionales, sin overhead del driver.

Auditoría de módulos:56 vértices en8 hojas compartidas, diferencia de normales base20.000° media y40.631° máxima antes del cambio. Calculada entre cada normal refinada y la primera normal del triángulo light de la misma hoja, mediante acos del producto normalizado. No es error final de iluminación ni medida de popping. La interpolación alcanza esa normal objetivo al lod0; puede quedar diferencia por interpolación de atributos entre topologías.

12 capturas reales,semilla712,media,1280x720,tres cámaras,día/noche,viento fijo2 y fuerza8. Seis parejas con cámara/hora/draws/triángulos iguales,sin errores. [Día normal](day-0-pair.webp), [noche normal](night-0-pair.webp). Vista diurna revisada conserva volumen y color; la diferencia es pequeña en imagen fija. No venderla como salto artístico demostrado: debe justificar su utilidad mediante transición temporal.

Conservar candidata para prueba de límite y medición GPU/CPU. Sin benchmark temporal todavía. No cambiar módulos originales ni integrar por defecto. Fuera de18–24 el viento cercano conserva su fuerza; se normaliza la normal interpolada.

```text
node tools/experiments/capture-grass-normal-lod-20261021.mjs
python tools/experiments/package-grass-normal-lod-20261021.py
```

Vite5190. PNG locales;parejas,metadatos y normal-audit.json publicados.
