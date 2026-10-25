# Legibilidad del subtítulo

Corrección solicitada: el subtítulo bajo el logo se perdía contra el cielo ilustrado.

Se sustituye el texto de 8 px y color translúcido por 11–13 px, peso 600, marfil opaco y una base oscura al 91%. Se reduce el espaciado entre letras. Conserva la animación y el ocultamiento del encabezado durante el viaje. CSS generado desde tools/prepare_menu.py, sin nuevas operaciones WebGL ni filtros.

Validación: capturas reales desktop.png (1280×720) y mobile.png (390×844), inspeccionadas. El texto cabe en pantalla; dos líneas en móvil. Datos de estilo y límites en menu-subtitle/report.json. 12/12 pruebas de generación/navegación pasan. No se atribuye una mejora de GPU a este cambio CSS.
