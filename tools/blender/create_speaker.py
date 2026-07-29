"""Create the original Estudiemos Room floor speaker.

Run with:
    blender --background --python tools/blender/create_speaker.py

The source blend and browser-ready GLB are generated deterministically. Blender
uses Z-up; glTF export converts the asset to the Y-up system used by Three.js.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = ROOT / "tools" / "blender"
TEXTURE_DIR = TOOLS_DIR / "textures"
EXPORT_PATH = ROOT / "public" / "models" / "custom" / "study-speaker.glb"
BLEND_PATH = TOOLS_DIR / "estudiemos-speaker.blend"

COLLECTION_NAME = "Study_Speaker"
MATERIALS: dict[str, bpy.types.Material] = {}


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return (
        int(value[0:2], 16) / 255,
        int(value[2:4], 16) / 255,
        int(value[4:6], 16) / 255,
        1.0,
    )


def reset_scene() -> bpy.types.Collection:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)

    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.world.color = srgb("#d9dfdc")[:3]
    return collection


def set_principled_input(node: bpy.types.Node, names: tuple[str, ...], value) -> None:
    for name in names:
        socket = node.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def make_material(
    name: str,
    color: str,
    roughness: float,
    metallic: float = 0.0,
    texture_name: str | None = None,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = srgb(color)
    material.roughness = roughness
    material.metallic = metallic

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    set_principled_input(principled, ("Base Color",), srgb(color))
    set_principled_input(principled, ("Roughness",), roughness)
    set_principled_input(principled, ("Metallic",), metallic)

    if texture_name:
        image = bpy.data.images.load(str(TEXTURE_DIR / texture_name), check_existing=True)
        image.pack()
        texture = nodes.new("ShaderNodeTexImage")
        texture.name = f"{name}_BaseColor"
        texture.image = image
        texture.interpolation = "Linear"
        texture.extension = "REPEAT"
        links.new(texture.outputs["Color"], principled.inputs["Base Color"])

    if emission:
        set_principled_input(principled, ("Emission Color", "Emission"), srgb(emission))
        set_principled_input(principled, ("Emission Strength",), emission_strength)

    MATERIALS[name] = material
    return material


def create_materials() -> None:
    make_material("Speaker_Body", "#182220", 0.38, 0.48, "metal_charcoal.png")
    make_material("Speaker_Baffle", "#0c1212", 0.62, 0.12, "metal_charcoal.png")
    make_material("Speaker_Grille", "#415c54", 0.88, 0.0, "fabric_sage.png")
    make_material("Speaker_Walnut", "#765039", 0.5, 0.0, "oak_warm.png")
    make_material("Speaker_Brass", "#b99a5d", 0.3, 0.74)
    make_material("Speaker_Steel", "#78837f", 0.25, 0.78, "metal_charcoal.png")
    make_material("Speaker_Rubber", "#070a0a", 0.94, 0.0)
    make_material("Speaker_Cone", "#101918", 0.74, 0.04)
    make_material("Speaker_Dustcap", "#263b37", 0.36, 0.16)
    make_material(
        "Speaker_Display",
        "#b7e3d5",
        0.25,
        0.08,
        emission="#9dd8c8",
        emission_strength=2.2,
    )
    make_material(
        "Speaker_Status",
        "#f4df9c",
        0.28,
        0.08,
        emission="#d8bd77",
        emission_strength=1.6,
    )


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def assign_material(obj: bpy.types.Object, material_name: str) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[material_name])


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 3) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new(name="Speaker_Edge_Soften", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.harden_normals = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def box(
    collection: bpy.types.Collection,
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    material: str,
    bevel: float = 0.04,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, min(size) * 0.22))
    move_to_collection(obj, collection)
    return obj


def tapered_box(
    collection: bpy.types.Collection,
    name: str,
    bottom_size: tuple[float, float],
    top_size: tuple[float, float],
    height: float,
    z_base: float,
    material: str,
    bevel: float = 0.08,
) -> bpy.types.Object:
    bottom_x, bottom_y = bottom_size[0] / 2, bottom_size[1] / 2
    top_x, top_y = top_size[0] / 2, top_size[1] / 2
    z_top = z_base + height
    vertices = [
        (-bottom_x, -bottom_y, z_base),
        (bottom_x, -bottom_y, z_base),
        (bottom_x, bottom_y, z_base),
        (-bottom_x, bottom_y, z_base),
        (-top_x, -top_y, z_top),
        (top_x, -top_y, z_top),
        (top_x, top_y, z_top),
        (-top_x, top_y, z_top),
    ]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (4, 0, 3, 7),
    ]
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    assign_material(obj, material)
    apply_bevel(obj, bevel, 4)
    return obj


def cylinder(
    collection: bpy.types.Collection,
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: str,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 32,
    bevel: float = 0.02,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, depth * 0.2), 2)
    move_to_collection(obj, collection)
    return obj


def torus(
    collection: bpy.types.Collection,
    name: str,
    major_radius: float,
    minor_radius: float,
    location: tuple[float, float, float],
    material: str,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=12,
        location=location,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    move_to_collection(obj, collection)
    return obj


def add_driver(
    collection: bpy.types.Collection,
    name: str,
    radius: float,
    z: float,
    accent_material: str,
    screw_count: int,
) -> None:
    front_y = -0.69
    cylinder(
        collection,
        f"{name}_Mount",
        radius + 0.12,
        0.13,
        (0, front_y, z),
        "Speaker_Baffle",
        rotation=(math.pi / 2, 0, 0),
        vertices=48,
        bevel=0.035,
    )
    torus(
        collection,
        f"{name}_AccentRing",
        radius + 0.035,
        0.055 if radius > 0.4 else 0.04,
        (0, front_y - 0.085, z),
        accent_material,
    )

    bpy.ops.mesh.primitive_cone_add(
        vertices=64,
        radius1=radius * 0.82,
        radius2=radius * 0.38,
        depth=0.16,
        location=(0, front_y - 0.14, z),
        rotation=(math.pi / 2, 0, 0),
    )
    cone = bpy.context.object
    cone.name = f"{name}_Cone"
    assign_material(cone, "Speaker_Cone")
    move_to_collection(cone, collection)

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=40,
        ring_count=20,
        location=(0, front_y - 0.245, z),
    )
    dustcap = bpy.context.object
    dustcap.name = f"{name}_Dustcap"
    dustcap.scale = (radius * 0.31, radius * 0.12, radius * 0.31)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(dustcap, "Speaker_Dustcap")
    move_to_collection(dustcap, collection)

    for index in range(screw_count):
        angle = math.tau * index / screw_count
        screw_radius = radius + 0.15
        x = math.cos(angle) * screw_radius
        screw_z = z + math.sin(angle) * screw_radius
        cylinder(
            collection,
            f"{name}_Screw_{index + 1}",
            0.028,
            0.025,
            (x, front_y - 0.105, screw_z),
            "Speaker_Steel",
            rotation=(math.pi / 2, 0, 0),
            vertices=16,
            bevel=0.006,
        )


def add_control_deck(collection: bpy.types.Collection) -> None:
    box(
        collection,
        "Speaker_ControlDeck",
        (1.72, 0.16, 0.43),
        (0, -0.72, 4.02),
        "Speaker_Baffle",
        0.07,
    )
    box(
        collection,
        "Speaker_ControlDisplay",
        (0.82, 0.035, 0.18),
        (-0.25, -0.812, 4.04),
        "Speaker_Display",
        0.025,
    )
    for index, width in enumerate((0.32, 0.23, 0.15, 0.09)):
        box(
            collection,
            f"Speaker_LevelBar_{index + 1}",
            (width, 0.02, 0.025),
            (-0.47 + width / 2, -0.835, 4.095 - index * 0.045),
            "Speaker_Status" if index < 2 else "Speaker_Display",
            0.005,
        )
    for index, x in enumerate((0.46, 0.72)):
        cylinder(
            collection,
            f"Speaker_ControlKnob_{index + 1}",
            0.105 if index == 0 else 0.075,
            0.08,
            (x, -0.815, 4.03),
            "Speaker_Brass" if index == 0 else "Speaker_Steel",
            rotation=(math.pi / 2, 0, 0),
            vertices=32,
            bevel=0.012,
        )


def create_speaker(collection: bpy.types.Collection) -> None:
    for x in (-0.96, 0.96):
        for y in (-0.42, 0.42):
            cylinder(
                collection,
                f"Speaker_Foot_{x}_{y}",
                0.13,
                0.1,
                (x, y, 0.05),
                "Speaker_Rubber",
                vertices=24,
                bevel=0.018,
            )

    box(collection, "Speaker_BaseShadow", (2.9, 1.45, 0.16), (0, 0, 0.18), "Speaker_Rubber", 0.1)
    box(collection, "Speaker_BasePlinth", (2.72, 1.32, 0.17), (0, 0, 0.3), "Speaker_Brass", 0.075)
    box(collection, "Speaker_FloatingBase", (2.48, 1.18, 0.22), (0, 0, 0.43), "Speaker_Body", 0.1)

    tapered_box(
        collection,
        "Speaker_Cabinet",
        bottom_size=(2.58, 1.18),
        top_size=(2.28, 1.05),
        height=3.94,
        z_base=0.47,
        material="Speaker_Body",
        bevel=0.13,
    )
    box(collection, "Speaker_FrontBaffle", (2.18, 0.16, 3.52), (0, -0.61, 2.25), "Speaker_Baffle", 0.13)
    box(collection, "Speaker_GrilleInset", (1.92, 0.045, 2.98), (0, -0.705, 2.1), "Speaker_Grille", 0.09)

    for side in (-1, 1):
        cheek = box(
            collection,
            f"Speaker_WalnutCheek_{'L' if side < 0 else 'R'}",
            (0.2, 1.13, 3.58),
            (side * 1.23, 0.015, 2.31),
            "Speaker_Walnut",
            0.09,
            rotation=(0, side * math.radians(1.8), 0),
        )
        cheek.rotation_euler.z = side * math.radians(-1.5)

        for index, z in enumerate((0.92, 1.7, 2.48, 3.26)):
            box(
                collection,
                f"Speaker_SideInlay_{side}_{index + 1}",
                (0.045, 1.16, 0.035),
                (side * 1.345, 0.01, z),
                "Speaker_Brass",
                0.008,
            )

    box(collection, "Speaker_TopCap", (2.46, 1.18, 0.18), (0, 0, 4.43), "Speaker_Walnut", 0.1)
    box(collection, "Speaker_TopInset", (1.38, 0.62, 0.07), (0, -0.08, 4.545), "Speaker_Body", 0.035)

    add_driver(collection, "Speaker_Tweeter", 0.28, 3.48, "Speaker_Steel", 4)
    add_driver(collection, "Speaker_Midrange", 0.48, 2.7, "Speaker_Brass", 6)
    add_driver(collection, "Speaker_Woofer", 0.7, 1.48, "Speaker_Brass", 8)

    cylinder(
        collection,
        "Speaker_BassPort",
        0.22,
        0.15,
        (0, -0.73, 0.66),
        "Speaker_Rubber",
        rotation=(math.pi / 2, 0, 0),
        vertices=40,
        bevel=0.03,
    )
    torus(collection, "Speaker_BassPortTrim", 0.22, 0.035, (0, -0.825, 0.66), "Speaker_Steel")

    add_control_deck(collection)

    for index, x in enumerate((-0.26, 0, 0.26)):
        box(
            collection,
            f"Speaker_IdentityMark_{index + 1}",
            (0.12, 0.025, 0.045 + index * 0.025),
            (x, -0.826, 0.97),
            "Speaker_Status",
            0.01,
            rotation=(0, 0, math.radians(-18)),
        )

    box(collection, "Speaker_RearPanel", (1.14, 0.04, 1.06), (0, 0.61, 1.16), "Speaker_Baffle", 0.06)
    for index, x in enumerate((-0.22, 0.22)):
        cylinder(
            collection,
            f"Speaker_RearTerminal_{index + 1}",
            0.09,
            0.08,
            (x, 0.665, 1.22),
            "Speaker_Brass" if index == 0 else "Speaker_Steel",
            rotation=(math.pi / 2, 0, 0),
            vertices=24,
            bevel=0.012,
        )


def collection_objects(collection: bpy.types.Collection) -> list[bpy.types.Object]:
    objects = list(collection.objects)
    for child in collection.children:
        objects.extend(collection_objects(child))
    return objects


def export_speaker(collection: bpy.types.Collection) -> None:
    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    objects = collection_objects(collection)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(EXPORT_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_animations=False,
    )


def main() -> None:
    collection = reset_scene()
    create_materials()
    create_speaker(collection)
    bpy.context.scene["asset_library"] = "Estudiemos Room Objects"
    bpy.context.scene["asset_name"] = "Study Speaker"
    bpy.context.scene["units"] = "meters"
    bpy.context.scene["export_format"] = "glTF 2.0 binary"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    export_speaker(collection)
    print(f"Created {len(collection_objects(collection))} speaker objects at {EXPORT_PATH}")


if __name__ == "__main__":
    main()
