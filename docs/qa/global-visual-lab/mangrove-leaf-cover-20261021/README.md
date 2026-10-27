# Prototipo Blender de hojas bajas

Asset propio generado con Blender5.2.2 headless,semilla712. Hojas romboidales arqueadas de cuatro triángulos,no planos cruzados. Cercano:8 hojas,32 triángulos,40 vértices,altura máxima.0895. Lejano inicial:4 hojas,8 triángulos,16 vértices. JSON para instancing,GLB cercano yfuente .blend conservados. No cambia modelos originales ni añade recursos externos/licencias ajenas.

[Vista de geometría](module-preview.png):render Cycles CPU16 muestras,640×640. La vista es blanca yno representa el material final del juego;se usa para inspeccionar silueta yplegado. No es captura del renderer ni prueba de integración.

Presupuesto medido por proyección periódica de triángulos del módulo cercano,orientación idéntica,sin máscaras ni pendientes:

| Separación | Triángulos por unidad cuadrada | Suelo cubierto |
|---|---|---|
| .50 |128|40.3%|
| .40 |200|52.7%|
| .35 |261|64.1%|
| .30 |356|76.8%|

Conclusión:el módulo inicial aún no cumple cubierta continua. No desplegarlo aumentando arbitrariamente instancias. Revisar primero distribución ytamaño de hojas para aprovechar mejor el área;el LOD lejano también necesita reparto más uniforme antes de uso. La cobertura proyectada no demuestra apariencia desde cámara de juego ni coste GPU. Muestreo numérico192×192,periodicidad sin rotaciones;resultado cambia con distribución real.

Siguiente paso:mejorar unidad,integrar en QA con máscaras existentes ycomparar en juego. No hay todavía prototipo jugable ni capturas reales de esta cubierta;no afirmar éxito visual. Los recursos se preservan como primera iteración,con el criterio fallido explícito.

```text
C:/Users/PC/tools/blender/blender-5.2.2-windows-x64/blender.exe --background --python tools/experiments/blender-mangrove-leaf-cover-20261021.py
```

El generador rechaza salida existente;archivarla antes de repetir. audit.json incluye presupuesto yproyección posterior. Main,predeterminado ysimulación intactos.
