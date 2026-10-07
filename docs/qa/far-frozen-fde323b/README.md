# Suite inmutable fde323b

Se extrajo `git archive fde323b` en `.cache/far-final-fde323b` y se ejecutó `node --test tests` con fuentes congeladas: 2.863/2.864, exit 1, 19 min 37 s. El fallo único compara hashes del atlas actualizado con el informe histórico de hulls. No se borró ese informe ni se relajó el test.

`ed5a46f` añade un derivado separado con los 44 hashes actuales y verifica cobertura alpha de todos sus píxeles, además de igualdad exacta de los 22 hulls con el histórico: 4/4 pruebas dirigidas pasan. No se presenta esa repetición dirigida como una nueva suite completa.

En la misma copia inmutable terminaron build (252 módulos), paquete (694 archivos, 403.491.791 bytes, 859 enlaces relativos y 20 GLB runtime), verify:web-assets y verify:audio-runtime con exit 0. `summary.json` conserva los resultados observados; `node-test.log.gz` es el log completo de la suite. La suite y campañas CPU coincidieron con el visor gráfico, por lo que estos tiempos no acreditan rendimiento.
