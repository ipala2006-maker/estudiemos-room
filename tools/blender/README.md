# Estudiemos Room - Blender architecture

This folder contains the editable source and deterministic generator for the
building architecture.

## Source

- `create_architecture.py`: creates materials, modular geometry and exports.
- `estudiemos-architecture.blend`: generated editable Blender source.
- `textures/`: small generated source textures packed into the Blender file.

## Rebuild

From the project root:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background `
  --python tools/blender/create_architecture.py
```

The exported GLB files are written to:

`public/models/custom/architecture/`

Validate the saved source and all exported modules:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  tools/blender/estudiemos-architecture.blend `
  --background `
  --python tools/blender/validate_architecture.py
```

Each component uses metric scale, a base-aligned pivot, named materials and
clean low-poly geometry suitable for browser rendering.

## Study speaker

The room speaker is a separate original Blender asset with its own editable
source:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background `
  --python tools/blender/create_speaker.py
```

This creates:

- `tools/blender/estudiemos-speaker.blend`
- `public/models/custom/study-speaker.glb`

Validate it with:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  tools/blender/estudiemos-speaker.blend `
  --background `
  --python tools/blender/validate_speaker.py
```
