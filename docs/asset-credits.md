# New Eden surface assets

The locally bundled 1K diffuse textures in `public/textures/` are CC0 assets from Poly Haven:

- `worn-asphalt.jpg` — [Worn Asphalt](https://polyhaven.com/a/worn_asphalt), Amal Kumar.
- `pavement.jpg` — [Pavement 01](https://polyhaven.com/a/pavement_01).
- `brick.jpg` — [Brick Wall 02](https://polyhaven.com/a/brick_wall_02).

They are packaged with the game; runtime rendering does not fetch them from Poly Haven. Procedural texture data remains as a fallback if a local image fails to load.

The four portraits in `public/portraits/` are original synthetic images generated for this game with the built-in image generation tool. They depict fictional adults, not photographs or likenesses of named real people. The [portrait prompts](portrait-prompts.md) record the asset brief. The game bundles compressed JPEG versions and does not fetch portraits at runtime.
