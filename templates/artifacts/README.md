# Interactive JS Artifacts

Embeddable JavaScript visualizations from [creative-clawing.com](https://creative-clawing.com).

These are standalone HTML canvas files that run in iframes with zero dependencies.
Each artifact is a self-contained visualization suitable for embedding in slide
stage panels (layout-split right column) or full-width content slides.

## Usage

Artifacts load via `<iframe>` in a slide's stage zone. The slide builder creates
an iframe element pointing to the artifact URL. Each artifact accepts optional
configuration via URL parameters or postMessage.

## Source Gallery

All artifacts originate from the Creative Clawing gallery:
- Live site: https://creative-clawing.com/gallery/
- Repository: https://github.com/milwrite/creative-clawing

## Catalog

| Artifact | Category | Interactive | Description |
|----------|----------|-------------|-------------|
| lorenz | chaos | yes (rotate) | Lorenz attractor, 3D trail visualization |
| boids | emergence | yes (click to add) | Flocking simulation, agent-based movement |
| life | cellular automata | yes (draw) | Conway's Game of Life |
| fourier | signal | yes (draw path) | Fourier series circle drawing |
| turing | reaction-diffusion | yes (paint) | Turing pattern formation |
| mandelbrot | fractal | yes (zoom) | Mandelbrot set zoom |
| nbody | physics | yes (drag) | N-body gravitational simulation |
| pagerank | graph | yes (click nodes) | PageRank visualization |
| percolation | phase transition | yes (adjust p) | Percolation grid model |
| logistic | chaos | yes (hover) | Logistic map bifurcation diagram |
| voronoi | geometry | yes (click) | Voronoi diagram partitioning |
| penrose | tiling | no | Aperiodic Penrose tiling |
