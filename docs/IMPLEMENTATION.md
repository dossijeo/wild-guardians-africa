# Registro de implementación

Fuente normativa: [Plan Maestro 2.0](plan/Wild_Guardians_Plan_Maestro_Definitivo.md).

## Estado

- Paquete descomprimido y documentación original preservada sin modificaciones.
- Repositorio inicial limpio, rama `main`, remoto `dossijeo/wild-guardians-africa`.
- Implementación en curso: simulación, navegación, extracción de assets, escena 3D y persistencia.
- Menú de producción: adaptación del diorama original `Wild_Guardians_Africa_Menu_V2_8_CORREGIDO_Balafons_Call.html`, conservando renderer, recorridos, iluminación, logo y música. Generador: `tools/prepare_menu.py`.
- HUD de producción: artwork, disposición adaptable, retratos y marco de contratación de `Wild_Guardians_HUD_Lab_Contratacion_Diaria.html`. Generador: `tools/prepare_hud.py`. La simulación de demostración no se utiliza como motor del juego.
- Los 159 casos recibidos son requisitos pendientes; no se contabilizan como pruebas ejecutadas.
- Los commits y pushes se realizan directamente en `main`, por preferencia explícita del usuario. No utilizar ramas de transferencia ni commits sin cambios de archivos.

## Contratos pendientes

Las aclaraciones del usuario están registradas en `content/balance/clarifications.json`: eventos sistémicos, riego inicial y madurez, monedas enteras, recarga desde lanzamiento, persistencia de cosechas, interrupción de reparaciones y prioridad del ataque sobre amanecer/victoria. Los parámetros visuales y de animación se recuperan de los HTML entregados.

## Validación

`python docs/plan/verificar_reglas.py` ejecuta la comprobación aritmética original. No constituye testeo de una partida integrada.
