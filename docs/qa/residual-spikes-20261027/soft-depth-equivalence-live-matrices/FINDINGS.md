# Current-matrix bounds

Camera restoration alone does not restore cached VFX projection uniforms changed by draw callbacks. Bounds now derive from current camera projection/view and effect matrixWorld, rather than cached uVP. Diagnostic state capture demonstrated crop-induced region expansion; current-matrix run has identical before/after bounds and zero depth differences in eight day/night, scale1/3, scissor/crop comparisons. Full clear and nonempty control retained. Static central fixture only; broader correctness and performance remain unproven.
