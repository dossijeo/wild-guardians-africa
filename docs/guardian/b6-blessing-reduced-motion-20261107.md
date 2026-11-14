# Movimiento reducido en bendiciones WebGPU

Al crear o reemplazar el Worker gráfico, el cliente transmite la preferencia actual `prefers-reduced-motion`. Las partículas de bendición conservan la altura fija, el pulso y el desvanecimiento de la ruta anterior, pero anulan sus desplazamientos horizontal y vertical cuando esa preferencia está activa. La selección usa un uniform y no crea otra variante del shader; las bendiciones y sus eventos siguen bajo autoridad de la simulación.

Las pruebas cubren la preferencia en la creación del cliente, los dos valores del efecto y la generación del mismo WGSL, con componentes gráficos simulados. La preferencia se lee al crear cada Worker, como en el renderer anterior; un cambio del sistema durante la misma sesión no se aplica hasta sustituirlo. Faltan la comparación visual y la comprobación en un navegador WebGPU real.
