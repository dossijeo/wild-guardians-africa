# Desvanecimiento de bendiciones en WebGPU

Cuando llega el evento confirmado de retirada o destrucción de una bendición que ya tenía una fuente visible, sus partículas permanecen durante 0,65 segundos de tiempo de simulación y su opacidad disminuye en GPU. El checkpoint de presentación conserva las fuentes en desaparición; los checkpoints anteriores sin ese campo siguen siendo válidos. Un evento repetido no reinicia el desvanecimiento y una fuente que nunca llegó a verse no aparece retrospectivamente.

Las pruebas dirigidas cubren eventos, eliminación, checkpoint y generación WGSL, usando componentes gráficos simulados. Queda pendiente comparar la apariencia en una partida WebGPU real y validar casos donde la presentación aún no había creado la fuente al llegar el evento. No se ha medido el coste del efecto.
