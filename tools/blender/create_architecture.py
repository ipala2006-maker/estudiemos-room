"""Build the modular Estudiemos Room architecture library.

Run with:
    blender --background --python tools/blender/create_architecture.py

The script owns the source .blend and exports one optimized GLB per reusable
architectural component. Blender uses Z-up; the glTF exporter converts the
assets to the Y-up coordinate system used by Three.js.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = ROOT / "tools" / "blender"
TEXTURE_DIR = TOOLS_DIR / "textures"
EXPORT_DIR = ROOT / "public" / "models" / "custom" / "architecture"
BLEND_PATH = TOOLS_DIR / "estudiemos-architecture.blend"

TEXTURE_SIZE = 128
MODULES: dict[str, bpy.types.Collection] = {}
MATERIALS: dict[str, bpy.types.Material] = {}


def srgb(hex_value: str) -> tuple[float, float, float, float]:
    value = hex_value.lstrip("#")
    return (
        int(value[0:2], 16) / 255,
        int(value[2:4], 16) / 255,
        int(value[4:6], 16) / 255,
        1.0,
    )


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)
    root = bpy.data.collections.get("Collection")
    if root:
        root.name = "Architecture_Library"
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.world.color = srgb("#d9dfdc")[:3]


def make_texture(
    name: str,
    base_hex: str,
    kind: str,
    seed: int,
) -> bpy.types.Image:
    randomizer = random.Random(seed)
    base = srgb(base_hex)
    pixels: list[float] = []

    for y in range(TEXTURE_SIZE):
        for x in range(TEXTURE_SIZE):
            nx = x / TEXTURE_SIZE
            ny = y / TEXTURE_SIZE
            variation = 0.0

            if kind == "oak":
                grain = math.sin(nx * 70 + math.sin(ny * 9) * 4) * 0.035
                bands = math.sin(nx * 13 + ny * 1.8) * 0.022
                variation = grain + bands + randomizer.uniform(-0.012, 0.012)
            elif kind == "terrazzo":
                variation = randomizer.uniform(-0.018, 0.018)
                cell = ((x * 37 + y * 61 + seed) % 251)
                if cell < 7:
                    variation += 0.13 if cell % 2 else -0.09
            elif kind == "fabric":
                weave = (0.022 if x % 4 == 0 else 0) + (0.018 if y % 5 == 0 else 0)
                variation = weave + randomizer.uniform(-0.01, 0.01)
            elif kind == "metal":
                brushed = math.sin(ny * 145) * 0.018
                variation = brushed + randomizer.uniform(-0.007, 0.007)
            elif kind == "plaster":
                cloud = math.sin(nx * 8) * math.sin(ny * 7) * 0.012
                variation = cloud + randomizer.uniform(-0.01, 0.01)

            pixels.extend(
                (
                    max(0.0, min(1.0, base[0] + variation)),
                    max(0.0, min(1.0, base[1] + variation)),
                    max(0.0, min(1.0, base[2] + variation)),
                    1.0,
                )
            )

    image = bpy.data.images.new(name, width=TEXTURE_SIZE, height=TEXTURE_SIZE, alpha=False)
    image.pixels.foreach_set(pixels)
    image.file_format = "PNG"
    image.filepath_raw = str(TEXTURE_DIR / f"{name}.png")
    image.save()
    image.pack()
    return image


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
    texture: bpy.types.Image | None = None,
    alpha: float = 1.0,
    emission: str | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*srgb(color)[:3], alpha)
    material.metallic = metallic
    material.roughness = roughness

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    set_principled_input(principled, ("Base Color",), srgb(color))
    set_principled_input(principled, ("Roughness",), roughness)
    set_principled_input(principled, ("Metallic",), metallic)
    set_principled_input(principled, ("Alpha",), alpha)

    if texture:
        texture_node = nodes.new("ShaderNodeTexImage")
        texture_node.name = f"{name}_BaseColor"
        texture_node.image = texture
        texture_node.interpolation = "Linear"
        texture_node.extension = "REPEAT"
        links.new(texture_node.outputs["Color"], principled.inputs["Base Color"])

    if emission:
        set_principled_input(principled, ("Emission Color", "Emission"), srgb(emission))
        set_principled_input(principled, ("Emission Strength",), emission_strength)

    if alpha < 1:
        material.surface_render_method = "DITHERED"
        material.use_transparency_overlap = False

    MATERIALS[name] = material
    return material


def create_materials() -> None:
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    oak = make_texture("oak_warm", "#9b704e", "oak", 11)
    terrazzo = make_texture("terrazzo_greige", "#aaa79d", "terrazzo", 23)
    fabric = make_texture("fabric_sage", "#567469", "fabric", 37)
    metal = make_texture("metal_charcoal", "#26312f", "metal", 41)
    plaster = make_texture("plaster_warm", "#ddd9cf", "plaster", 53)

    make_material("Plaster_WarmWhite", "#ddd9cf", 0.78, texture=plaster)
    make_material("Plaster_SoftGrey", "#b7bbb5", 0.74, texture=plaster)
    make_material("Terrazzo_Greige", "#aaa79d", 0.7, texture=terrazzo)
    make_material("Oak_Warm", "#9b704e", 0.52, texture=oak)
    make_material("Oak_Dark", "#4a352b", 0.58, texture=oak)
    make_material("Metal_Charcoal", "#26312f", 0.34, metallic=0.58, texture=metal)
    make_material("Metal_Black", "#111817", 0.3, metallic=0.5, texture=metal)
    make_material("Metal_BrushedSteel", "#77827e", 0.31, metallic=0.72, texture=metal)
    make_material("Brass_Satin", "#b89b62", 0.35, metallic=0.68)
    make_material("Sage_Fabric", "#567469", 0.83, texture=fabric)
    make_material("Sage_Panel", "#607f75", 0.62)
    make_material("Glass_Clear", "#bcd8d4", 0.18, metallic=0.02, alpha=0.28)
    make_material("Glass_Smoke", "#49615d", 0.22, metallic=0.05, alpha=0.34)
    make_material(
        "Light_Warm",
        "#fff0d2",
        0.28,
        emission="#ffe2aa",
        emission_strength=2.4,
    )
    make_material(
        "Light_Mint",
        "#bde4d9",
        0.3,
        emission="#9dd8c7",
        emission_strength=2.0,
    )
    make_material("Rubber_Dark", "#141b1a", 0.9)


def module_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    MODULES[name] = collection
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def assign_material(obj: bpy.types.Object, material_name: str) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[material_name])


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    if width <= 0:
        return
    modifier = obj.modifiers.new(name="Architectural_Bevel", type="BEVEL")
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
    bevel: float = 0.025,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    apply_bevel(obj, min(bevel, min(size) * 0.22), 2)
    move_to_collection(obj, collection)
    return obj


def cylinder(
    collection: bpy.types.Collection,
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: str,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 16,
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
    bevel = obj.modifiers.new(name="Edge_Soften", type="BEVEL")
    bevel.width = min(radius * 0.16, 0.025)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    move_to_collection(obj, collection)
    return obj


def create_wall_solid() -> None:
    c = module_collection("wall-solid")
    # A recessed, unbeveled core keeps repeated modules visually watertight.
    box(c, "Wall_ClosureCore", (4.08, 0.28, 3.04), (0, 0, 1.5), "Plaster_WarmWhite", 0)
    box(c, "Wall_Core", (4.0, 0.34, 3.0), (0, 0, 1.5), "Plaster_WarmWhite", 0.045)
    for side in (-1, 1):
        face_y = side * 0.185
        box(c, f"Wall_Base_{side}", (3.84, 0.07, 0.24), (0, face_y, 0.16), "Oak_Dark", 0.018)
        box(c, f"Wall_ShadowLine_{side}", (3.7, 0.045, 0.045), (0, face_y, 2.55), "Brass_Satin", 0.008)
        for x in (-1.35, 1.35):
            box(c, f"Wall_Reveal_{side}_{x}", (0.038, 0.045, 2.0), (x, face_y, 1.35), "Metal_Charcoal", 0.006)


def create_wall_door() -> None:
    c = module_collection("wall-door")
    box(c, "DoorWall_Left", (0.95, 0.34, 3.0), (-1.525, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "DoorWall_Right", (0.95, 0.34, 3.0), (1.525, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "DoorWall_Header", (2.1, 0.34, 0.58), (0, 0, 2.71), "Plaster_WarmWhite", 0.035)
    for side in (-1, 1):
        face_y = side * 0.2
        box(c, f"Door_Jamb_Left_{side}", (0.14, 0.1, 2.42), (-1.06, face_y, 1.21), "Metal_Charcoal", 0.018)
        box(c, f"Door_Jamb_Right_{side}", (0.14, 0.1, 2.42), (1.06, face_y, 1.21), "Metal_Charcoal", 0.018)
        box(c, f"Door_Jamb_Head_{side}", (2.26, 0.1, 0.14), (0, face_y, 2.42), "Oak_Warm", 0.018)
    box(c, "Door_Threshold", (2.16, 0.5, 0.075), (0, 0, 0.035), "Brass_Satin", 0.015)


def create_wall_window() -> None:
    c = module_collection("wall-window")
    box(c, "WindowWall_Left", (0.7, 0.34, 3.0), (-1.65, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Right", (0.7, 0.34, 3.0), (1.65, 0, 1.5), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Base", (2.6, 0.34, 0.78), (0, 0, 0.39), "Plaster_WarmWhite", 0.04)
    box(c, "WindowWall_Header", (2.6, 0.34, 0.68), (0, 0, 2.66), "Plaster_WarmWhite", 0.04)
    box(c, "Window_Glass", (2.42, 0.08, 1.52), (0, 0, 1.64), "Glass_Clear", 0.01)
    box(c, "Window_Frame_Left", (0.12, 0.19, 1.68), (-1.27, 0, 1.64), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Right", (0.12, 0.19, 1.68), (1.27, 0, 1.64), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Top", (2.66, 0.19, 0.12), (0, 0, 2.48), "Metal_Charcoal", 0.012)
    box(c, "Window_Frame_Bottom", (2.66, 0.19, 0.12), (0, 0, 0.8), "Metal_Charcoal", 0.012)
    box(c, "Window_Mullion", (0.1, 0.2, 1.54), (0, 0, 1.64), "Brass_Satin", 0.012)
    box(c, "Window_Sill", (2.84, 0.62, 0.1), (0, 0, 0.74), "Oak_Warm", 0.018)


def create_floor_panel() -> None:
    c = module_collection("floor-panel")
    box(c, "Floor_ClosureSlab", (4.08, 4.08, 0.18), (0, 0, -0.14), "Terrazzo_Greige", 0)
    box(c, "Floor_Slab", (4.0, 4.0, 0.22), (0, 0, -0.12), "Terrazzo_Greige", 0.035)
    box(c, "Floor_Inlay_X", (3.72, 0.035, 0.018), (0, 0, 0.015), "Brass_Satin", 0.006)
    box(c, "Floor_Inlay_Y", (0.035, 3.72, 0.018), (0, 0, 0.015), "Brass_Satin", 0.006)
    for x, y in ((-1.72, -1.72), (1.72, -1.72), (-1.72, 1.72), (1.72, 1.72)):
        cylinder(c, f"Floor_Pin_{x}_{y}", 0.045, 0.024, (x, y, 0.018), "Brass_Satin", vertices=12)


def create_ceiling_panel() -> None:
    c = module_collection("ceiling-panel")
    box(c, "Ceiling_ClosureSlab", (4.08, 4.08, 0.12), (0, 0, 0.08), "Plaster_SoftGrey", 0)
    box(c, "Ceiling_Slab", (4.0, 4.0, 0.2), (0, 0, 0.1), "Plaster_SoftGrey", 0.035)
    box(c, "Ceiling_Recess", (2.9, 2.9, 0.08), (0, 0, -0.035), "Sage_Panel", 0.035)
    box(c, "Ceiling_Light", (2.45, 0.22, 0.055), (0, 0, -0.085), "Light_Warm", 0.02)
    for x in (-1.55, 1.55):
        box(c, f"Ceiling_Trim_{x}", (0.035, 3.3, 0.04), (x, 0, -0.045), "Metal_Charcoal", 0.006)


def create_column() -> None:
    c = module_collection("column")
    box(c, "Column_Core", (0.78, 0.78, 3.0), (0, 0, 1.5), "Plaster_SoftGrey", 0.065)
    box(c, "Column_Base", (0.94, 0.94, 0.16), (0, 0, 0.08), "Metal_Charcoal", 0.038)
    box(c, "Column_Cap", (0.94, 0.94, 0.16), (0, 0, 2.92), "Oak_Warm", 0.038)
    box(c, "Column_Band", (0.83, 0.83, 0.055), (0, 0, 1.18), "Brass_Satin", 0.014)


def create_railing() -> None:
    c = module_collection("railing")
    box(c, "Railing_Top", (4.0, 0.12, 0.12), (0, 0, 1.08), "Oak_Warm", 0.035)
    box(c, "Railing_Bottom", (3.88, 0.08, 0.08), (0, 0, 0.16), "Metal_Charcoal", 0.018)
    for x in (-1.92, -0.64, 0.64, 1.92):
        box(c, f"Railing_Post_{x}", (0.1, 0.1, 1.04), (x, 0, 0.54), "Metal_Charcoal", 0.022)
    for x in (-1.28, 0, 1.28):
        box(c, f"Railing_Glass_{x}", (1.14, 0.035, 0.72), (x, 0, 0.58), "Glass_Clear", 0.008)
    box(c, "Railing_Accent", (3.78, 0.045, 0.045), (0, -0.075, 0.89), "Brass_Satin", 0.008)


def create_stair_flight() -> None:
    c = module_collection("stair-flight")
    width = 6.6
    run = 15.4
    rise = 10.0
    step_count = 32
    step_depth = run / step_count
    step_rise = rise / step_count

    for index in range(step_count):
        height = step_rise * (index + 1)
        y = -run / 2 + step_depth * (index + 0.5)
        box(
            c,
            f"Stair_Tread_{index + 1:02d}",
            (width - 0.22, step_depth + 0.035, 0.16),
            (0, y, height - 0.08),
            "Terrazzo_Greige",
            0.022,
        )
        box(
            c,
            f"Stair_Riser_{index + 1:02d}",
            (width - 0.24, 0.095, step_rise + 0.03),
            (0, y - step_depth / 2 + 0.035, height - step_rise / 2),
            "Plaster_SoftGrey",
            0.015,
        )
        box(
            c,
            f"Stair_Nosing_{index + 1:02d}",
            (width - 0.38, 0.045, 0.035),
            (0, y - step_depth / 2 + 0.018, height + 0.018),
            "Metal_BrushedSteel",
            0.009,
        )

    slope_length = math.hypot(run, rise)
    slope_angle = math.atan2(rise, run)
    box(
        c,
        "Stair_Structural_Slab",
        (width - 0.72, slope_length, 0.28),
        (0, 0, rise / 2 - 0.42),
        "Plaster_SoftGrey",
        0.035,
        rotation=(slope_angle, 0, 0),
    )
    for x in (-width / 2 + 0.14, width / 2 - 0.14):
        box(
            c,
            f"Stair_Stringer_{x}",
            (0.22, slope_length, 0.38),
            (x, 0, rise / 2 - 0.18),
            "Metal_Charcoal",
            0.03,
            rotation=(slope_angle, 0, 0),
        )
        for rail_index, rail_height in enumerate((0.64, 1.08)):
            cylinder(
                c,
                f"Stair_Rail_{x}_{rail_index + 1}",
                0.052 if rail_index == 0 else 0.065,
                slope_length,
                (x, 0, rise / 2 + rail_height),
                "Metal_BrushedSteel" if rail_index == 0 else "Oak_Warm",
                rotation=(math.pi / 2 + slope_angle, 0, 0),
                vertices=16,
            )
        for post_index in range(7):
            progress = post_index / 6
            y = -run / 2 + progress * run
            z = progress * rise + 0.56
            box(c, f"Stair_Post_{x}_{post_index}", (0.09, 0.09, 1.12), (x, y, z), "Metal_Charcoal", 0.018)


def create_stair_landing() -> None:
    c = module_collection("stair-landing")
    box(c, "Landing_ClosureSlab", (7.08, 4.33, 0.2), (0, 0, -0.15), "Terrazzo_Greige", 0)
    box(c, "Landing_Slab", (7.0, 4.25, 0.26), (0, 0, -0.13), "Terrazzo_Greige", 0.04)
    box(c, "Landing_Edge", (6.78, 0.12, 0.08), (0, -2.03, 0.02), "Metal_BrushedSteel", 0.016)
    box(c, "Landing_Inlay", (5.5, 0.04, 0.02), (0, 0, 0.018), "Brass_Satin", 0.007)


def create_stairwell_portal() -> None:
    c = module_collection("stairwell-portal")
    width = 7.8
    height = 7.8
    box(c, "StairPortal_Left", (0.42, 0.64, height), (-3.69, 0, height / 2), "Plaster_SoftGrey", 0.055)
    box(c, "StairPortal_Right", (0.42, 0.64, height), (3.69, 0, height / 2), "Plaster_SoftGrey", 0.055)
    box(c, "StairPortal_Header", (width, 0.64, 0.42), (0, 0, height - 0.21), "Plaster_SoftGrey", 0.055)
    box(c, "StairPortal_InnerLeft", (0.12, 0.72, height - 0.72), (-3.43, -0.03, (height - 0.72) / 2), "Metal_Charcoal", 0.022)
    box(c, "StairPortal_InnerRight", (0.12, 0.72, height - 0.72), (3.43, -0.03, (height - 0.72) / 2), "Metal_Charcoal", 0.022)
    box(c, "StairPortal_InnerTop", (6.98, 0.72, 0.12), (0, -0.03, height - 0.47), "Oak_Warm", 0.025)
    box(c, "StairPortal_BaseLeft", (0.72, 0.82, 0.18), (-3.52, 0, 0.09), "Metal_Charcoal", 0.03)
    box(c, "StairPortal_BaseRight", (0.72, 0.82, 0.18), (3.52, 0, 0.09), "Metal_Charcoal", 0.03)
    box(c, "StairPortal_Light", (3.7, 0.16, 0.08), (0, -0.38, height - 0.58), "Light_Warm", 0.018)


def create_elevator_shaft_shell() -> None:
    c = module_collection("elevator-shaft-shell")
    width = 10.6
    depth = 5.6
    height = 9.25
    wall = 0.34
    front_fill = (width - 8.9) / 2

    for x in (-width / 2 + wall / 2, width / 2 - wall / 2):
        box(
            c,
            f"Shaft_SideClosure_{x}",
            (wall - 0.06, depth + 0.08, height + 0.06),
            (x, depth / 2, height / 2 - 0.01),
            "Plaster_WarmWhite",
            0,
        )
        box(c, f"Shaft_Side_{x}", (wall, depth, height), (x, depth / 2, height / 2), "Plaster_WarmWhite", 0.055)
        box(
            c,
            f"Shaft_InteriorPanel_{x}",
            (0.055, depth - 0.65, 4.7),
            (x - math.copysign(0.2, x), depth / 2 + 0.1, 2.75),
            "Sage_Panel",
            0.018,
        )
        box(
            c,
            f"Shaft_InteriorBase_{x}",
            (0.07, depth - 0.45, 0.22),
            (x - math.copysign(0.21, x), depth / 2, 0.16),
            "Oak_Dark",
            0.018,
        )

    box(
        c,
        "Shaft_BackClosure",
        (width + 0.08, wall - 0.06, height + 0.06),
        (0, depth - wall / 2, height / 2 - 0.01),
        "Plaster_WarmWhite",
        0,
    )
    box(c, "Shaft_BackWall", (width, wall, height), (0, depth - wall / 2, height / 2), "Plaster_WarmWhite", 0.055)
    box(c, "Shaft_BackPanel", (8.8, 0.055, 4.7), (0, depth - wall - 0.02, 2.75), "Sage_Panel", 0.018)
    box(c, "Shaft_BackBase", (9.7, 0.07, 0.22), (0, depth - wall - 0.03, 0.16), "Oak_Dark", 0.018)
    box(c, "Shaft_Ceiling", (width, depth, 0.24), (0, depth / 2, height - 0.12), "Plaster_SoftGrey", 0.045)
    box(c, "Shaft_CeilingLight", (4.4, 0.5, 0.065), (0, depth / 2, height - 0.27), "Light_Mint", 0.02)

    for side in (-1, 1):
        x = side * (8.9 / 2 + front_fill / 2)
        box(
            c,
            f"Shaft_FrontPierClosure_{side}",
            (front_fill + 0.08, 0.44, height + 0.06),
            (x, 0.22, height / 2 - 0.01),
            "Plaster_WarmWhite",
            0,
        )
        box(c, f"Shaft_FrontPier_{side}", (front_fill, 0.52, height), (x, 0.2, height / 2), "Plaster_WarmWhite", 0.055)
        box(c, f"Shaft_FrontPierBase_{side}", (front_fill + 0.08, 0.58, 0.22), (x, 0.14, 0.16), "Oak_Dark", 0.02)
    box(c, "Shaft_FrontHeaderClosure", (width + 0.08, 0.44, 1.16), (0, 0.22, 8.68), "Plaster_WarmWhite", 0)
    box(c, "Shaft_FrontHeader", (width, 0.52, 1.1), (0, 0.2, 8.7), "Plaster_WarmWhite", 0.055)
    box(c, "Shaft_FrontShadowLine", (9.7, 0.06, 0.055), (0, -0.075, 8.18), "Brass_Satin", 0.012)


def create_elevator_portal() -> None:
    c = module_collection("elevator-portal")
    # The closure pieces overlap the shaft piers so no background can show
    # through the beveled portal-to-wall joint.
    box(c, "Portal_Closure_Left", (1.34, 0.58, 7.82), (-4.04, 0.05, 3.91), "Metal_Black", 0)
    box(c, "Portal_Closure_Right", (1.34, 0.58, 7.82), (4.04, 0.05, 3.91), "Metal_Black", 0)
    box(c, "Portal_Closure_Header", (9.42, 0.58, 0.72), (0, 0.05, 7.62), "Metal_Black", 0)
    box(c, "Portal_Left", (1.24, 0.72, 7.8), (-4.02, 0, 3.9), "Metal_Charcoal", 0.07)
    box(c, "Portal_Right", (1.24, 0.72, 7.8), (4.02, 0, 3.9), "Metal_Charcoal", 0.07)
    box(c, "Portal_Header", (9.28, 0.72, 0.58), (0, 0, 7.62), "Metal_Charcoal", 0.07)
    box(c, "Portal_Reveal_Left", (0.2, 0.82, 6.72), (-3.45, 0, 3.36), "Brass_Satin", 0.025)
    box(c, "Portal_Reveal_Right", (0.2, 0.82, 6.72), (3.45, 0, 3.36), "Brass_Satin", 0.025)
    box(c, "Portal_Reveal_Top", (7.0, 0.82, 0.2), (0, 0, 6.68), "Brass_Satin", 0.025)
    box(c, "Portal_Threshold", (7.35, 1.0, 0.13), (0, -0.08, 0.06), "Metal_Black", 0.025)
    box(c, "Portal_Threshold_Inlay", (6.82, 0.82, 0.035), (0, -0.08, 0.14), "Brass_Satin", 0.009)
    box(c, "Portal_Canopy", (9.62, 1.1, 0.2), (0, 0, 8.05), "Oak_Warm", 0.055)
    box(c, "Portal_Light", (4.8, 0.2, 0.1), (0, -0.55, 7.34), "Light_Mint", 0.025)


def create_elevator_door_panel() -> None:
    c = module_collection("elevator-door-panel")
    box(c, "Elevator_Door_Core", (3.15, 0.14, 5.8), (0, 0, 2.9), "Metal_BrushedSteel", 0.035)
    box(c, "Elevator_Door_Inset", (2.72, 0.045, 5.25), (0, -0.085, 2.9), "Metal_Charcoal", 0.018)
    for z in (0.68, 2.9, 5.12):
        box(c, f"Elevator_Door_Band_{z}", (2.5, 0.06, 0.055), (0, -0.12, z), "Brass_Satin", 0.012)
    for x in (-1.18, 1.18):
        box(c, f"Elevator_Door_Rib_{x}", (0.045, 0.055, 4.7), (x, -0.115, 2.9), "Sage_Panel", 0.008)


def create_elevator_cabin_shell() -> None:
    c = module_collection("elevator-cabin-shell")
    width = 7.0
    depth = 5.2
    height = 6.2
    box(c, "Cabin_Floor", (width, depth, 0.2), (0, 0, -0.1), "Terrazzo_Greige", 0.04)
    box(c, "Cabin_Floor_Inlay", (5.9, 3.9, 0.035), (0, 0, 0.03), "Metal_Charcoal", 0.025)
    for x in (-width / 2 + 0.09, width / 2 - 0.09):
        box(c, f"Cabin_Side_{x}", (0.18, depth, height), (x, 0, height / 2), "Plaster_SoftGrey", 0.045)
        box(c, f"Cabin_SideInset_{x}", (0.05, depth - 0.65, 4.35), (x - math.copysign(0.105, x), 0, 2.72), "Sage_Panel", 0.018)
        cylinder(
            c,
            f"Cabin_Handrail_{x}",
            0.075,
            depth - 0.9,
            (x - math.copysign(0.18, x), 0, 1.32),
            "Oak_Warm",
            rotation=(math.pi / 2, 0, 0),
            vertices=16,
        )
    box(c, "Cabin_Ceiling", (width, depth, 0.2), (0, 0, height + 0.1), "Metal_Charcoal", 0.04)
    box(c, "Cabin_Ceiling_Recess", (5.8, 4.0, 0.08), (0, 0, height - 0.03), "Metal_Black", 0.03)
    box(c, "Cabin_Light_Left", (2.35, 0.45, 0.055), (-1.48, 0, height - 0.1), "Light_Mint", 0.02)
    box(c, "Cabin_Light_Right", (2.35, 0.45, 0.055), (1.48, 0, height - 0.1), "Light_Warm", 0.02)
    for y in (-depth / 2 + 0.08, depth / 2 - 0.08):
        box(c, f"Cabin_Header_{y}", (width, 0.18, 0.5), (0, y, height - 0.3), "Metal_Charcoal", 0.035)
        box(c, f"Cabin_Header_Accent_{y}", (5.0, 0.055, 0.055), (0, y - math.copysign(0.12, y), height - 0.52), "Brass_Satin", 0.012)
    box(c, "Cabin_Control_Backplate", (0.08, 1.5, 2.55), (width / 2 - 0.17, 0.45, 3.16), "Metal_Black", 0.035)


def create_reception_desk() -> None:
    c = module_collection("reception-desk")
    box(c, "Reception_Base", (4.7, 1.55, 0.85), (0, 0, 0.425), "Oak_Dark", 0.12)
    box(c, "Reception_Front", (4.35, 0.22, 1.12), (0, -0.72, 0.64), "Sage_Panel", 0.08, rotation=(math.radians(-4), 0, 0))
    box(c, "Reception_Top", (4.95, 1.78, 0.14), (0, 0, 1.02), "Terrazzo_Greige", 0.07)
    box(c, "Reception_Worktop", (3.35, 0.95, 0.11), (0.45, 0.12, 1.13), "Oak_Warm", 0.055)
    for x in (-1.72, -0.86, 0, 0.86, 1.72):
        box(c, f"Reception_Rib_{x}", (0.08, 0.08, 0.72), (x, -0.86, 0.57), "Brass_Satin", 0.015)
    box(c, "Reception_Kick", (3.95, 0.1, 0.1), (0, -0.82, 0.16), "Metal_Black", 0.02)


def create_built_in_bench() -> None:
    c = module_collection("built-in-bench")
    box(c, "Bench_Platform", (4.8, 1.18, 0.28), (0, 0, 0.46), "Oak_Dark", 0.08)
    box(c, "Bench_Seat", (4.5, 1.05, 0.24), (0, -0.03, 0.72), "Sage_Fabric", 0.1)
    box(c, "Bench_Back", (4.5, 0.24, 1.18), (0, 0.47, 1.25), "Sage_Fabric", 0.11, rotation=(math.radians(-6), 0, 0))
    for x in (-1.65, 0, 1.65):
        box(c, f"Bench_Leg_{x}", (0.16, 0.82, 0.46), (x, 0, 0.23), "Metal_Charcoal", 0.035)
    box(c, "Bench_BackRail", (4.72, 0.13, 0.13), (0, 0.6, 1.78), "Oak_Warm", 0.035)


def create_entry_portal() -> None:
    c = module_collection("entry-portal")
    box(c, "Entry_Left", (0.38, 0.5, 7.1), (-3.92, 0, 3.55), "Metal_Charcoal", 0.055)
    box(c, "Entry_Right", (0.38, 0.5, 7.1), (3.92, 0, 3.55), "Metal_Charcoal", 0.055)
    box(c, "Entry_Header", (8.22, 0.5, 0.38), (0, 0, 7.02), "Metal_Charcoal", 0.055)
    box(c, "Entry_Glass_Left", (3.65, 0.06, 6.55), (-1.88, 0, 3.36), "Glass_Clear", 0.012)
    box(c, "Entry_Glass_Right", (3.65, 0.06, 6.55), (1.88, 0, 3.36), "Glass_Clear", 0.012)
    box(c, "Entry_Mullion", (0.14, 0.18, 6.7), (0, 0, 3.4), "Brass_Satin", 0.022)
    for x in (-1.88, 1.88):
        box(c, f"Entry_Handle_{x}", (0.11, 0.24, 1.05), (x + math.copysign(0.55, -x), -0.18, 3.05), "Oak_Warm", 0.03)
    box(c, "Entry_Threshold", (8.0, 0.88, 0.12), (0, 0, 0.055), "Terrazzo_Greige", 0.025)
    box(c, "Entry_Canopy", (9.1, 1.45, 0.22), (0, 0.25, 7.48), "Oak_Warm", 0.065)
    box(c, "Entry_Canopy_Light", (5.2, 0.2, 0.07), (0, -0.48, 7.32), "Light_Warm", 0.02)


def create_giant_screen_surround() -> None:
    c = module_collection("giant-screen-surround")
    width = 50.6
    height = 15.4
    frame = 0.72
    box(c, "Screen_Frame_Left", (frame, 0.52, height), (-width / 2 + frame / 2, 0, height / 2), "Metal_Black", 0.11)
    box(c, "Screen_Frame_Right", (frame, 0.52, height), (width / 2 - frame / 2, 0, height / 2), "Metal_Black", 0.11)
    box(c, "Screen_Frame_Top", (width - frame * 2, 0.52, frame), (0, 0, height - frame / 2), "Metal_Black", 0.11)
    box(c, "Screen_Frame_Bottom", (width - frame * 2, 0.52, frame), (0, 0, frame / 2), "Metal_Black", 0.11)
    box(c, "Screen_Shadow_Left", (0.18, 0.62, height - 1.6), (-width / 2 + 1.0, 0, height / 2), "Brass_Satin", 0.025)
    box(c, "Screen_Shadow_Right", (0.18, 0.62, height - 1.6), (width / 2 - 1.0, 0, height / 2), "Sage_Panel", 0.025)
    box(c, "Screen_Inner_Top", (width - 2.2, 0.62, 0.13), (0, -0.04, height - 1.0), "Light_Mint", 0.025)
    box(c, "Screen_Inner_Bottom", (width - 2.2, 0.62, 0.13), (0, -0.04, 1.0), "Light_Warm", 0.025)
    box(c, "Screen_Low_Console", (40.0, 1.05, 0.52), (0, 0.32, 0.28), "Oak_Dark", 0.12)
    box(c, "Screen_Low_Console_Top", (41.2, 1.25, 0.14), (0, 0.32, 0.62), "Terrazzo_Greige", 0.07)
    for x in (-18, -12, -6, 0, 6, 12, 18):
        box(c, f"Screen_Console_Rib_{x}", (0.1, 1.1, 0.4), (x, -0.28, 0.25), "Brass_Satin", 0.018)
    for x in (-23.55, 23.55):
        for z in (2.0, 7.7, 13.4):
            cylinder(c, f"Screen_Fastener_{x}_{z}", 0.11, 0.08, (x, -0.34, z), "Brass_Satin", rotation=(math.pi / 2, 0, 0), vertices=16)


def create_study_workstation() -> None:
    c = module_collection("study-workstation")
    box(c, "Workstation_Desktop", (6.4, 2.35, 0.24), (0, 0, 1.07), "Oak_Warm", 0.09)
    box(c, "Workstation_Desktop_Inlay", (5.85, 0.055, 0.035), (0, -1.18, 1.12), "Brass_Satin", 0.009)
    for x in (-2.9, 2.9):
        for y in (-0.84, 0.84):
            cylinder(c, f"Workstation_Leg_{x}_{y}", 0.09, 0.96, (x, y, 0.52), "Metal_Charcoal", vertices=16)
            box(c, f"Workstation_Foot_{x}_{y}", (0.42, 0.42, 0.08), (x, y, 0.04), "Rubber_Dark", 0.025)
    box(c, "Workstation_Drawer", (1.12, 1.5, 0.86), (-2.4, -0.02, 0.48), "Oak_Dark", 0.07)
    for z in (0.34, 0.66):
        box(c, f"Workstation_DrawerFront_{z}", (0.94, 0.08, 0.24), (-2.4, -0.8, z), "Sage_Panel", 0.04)
        box(c, f"Workstation_DrawerPull_{z}", (0.36, 0.09, 0.05), (-2.4, -0.87, z), "Brass_Satin", 0.018)
    box(c, "Workstation_Monitor_Base", (1.3, 0.75, 0.09), (0, -0.18, 1.23), "Metal_Charcoal", 0.04)
    box(c, "Workstation_Monitor_Stem", (0.22, 0.18, 0.78), (0, 0.24, 1.61), "Metal_Charcoal", 0.035)
    box(c, "Workstation_Monitor_Frame", (2.78, 0.22, 1.62), (0, 0.49, 2.42), "Metal_Black", 0.08)
    box(c, "Workstation_Monitor_Recess", (2.48, 0.06, 1.32), (0, 0.365, 2.42), "Sage_Panel", 0.035)
    box(c, "Workstation_Tower", (0.82, 1.0, 1.34), (2.42, 0.18, 0.73), "Metal_Black", 0.08)
    box(c, "Workstation_TowerInset", (0.62, 0.05, 1.06), (2.42, -0.345, 0.78), "Sage_Panel", 0.04)
    cylinder(c, "Workstation_TowerButton", 0.085, 0.06, (2.42, -0.4, 1.15), "Light_Mint", rotation=(math.pi / 2, 0, 0), vertices=16)
    box(c, "Workstation_Keyboard", (1.9, 0.58, 0.08), (-0.55, -0.72, 1.23), "Metal_Charcoal", 0.045, rotation=(math.radians(-3), 0, 0))
    for row in range(3):
        for col in range(8):
            box(
                c,
                f"Workstation_Key_{row}_{col}",
                (0.15, 0.1, 0.035),
                (-1.12 + col * 0.17, -0.9 + row * 0.13, 1.3),
                "Plaster_WarmWhite",
                0.012,
            )
    box(c, "Workstation_MousePad", (1.05, 0.72, 0.035), (1.3, -0.72, 1.2), "Rubber_Dark", 0.06)
    box(c, "Workstation_Mouse", (0.34, 0.48, 0.14), (1.3, -0.72, 1.31), "Plaster_SoftGrey", 0.09)
    cylinder(c, "Workstation_Lamp_Stem", 0.055, 1.18, (-2.65, 0.45, 1.78), "Metal_Charcoal", rotation=(0, math.radians(-18), 0), vertices=16)
    box(c, "Workstation_Lamp_Head", (0.62, 0.42, 0.2), (-2.45, 0.45, 2.35), "Oak_Dark", 0.08, rotation=(0, math.radians(-12), 0))
    box(c, "Workstation_Lamp_Light", (0.42, 0.22, 0.05), (-2.42, 0.23, 2.27), "Light_Warm", 0.02)


def create_shop_counter() -> None:
    c = module_collection("shop-counter")
    box(c, "Shop_Counter_Body", (3.4, 1.25, 0.72), (0, 0, 0.42), "Sage_Panel", 0.12)
    box(c, "Shop_Counter_Front", (3.1, 0.16, 0.68), (0, -0.66, 0.46), "Metal_Black", 0.07, rotation=(math.radians(-3), 0, 0))
    box(c, "Shop_Counter_Top", (3.65, 1.5, 0.14), (0, 0, 0.87), "Oak_Warm", 0.08)
    box(c, "Shop_Counter_Plinth", (3.05, 1.1, 0.11), (0, 0, 0.055), "Metal_Charcoal", 0.035)
    for x in (-1.18, -0.58, 0, 0.58, 1.18):
        box(c, f"Shop_Counter_Rib_{x}", (0.065, 0.08, 0.5), (x, -0.77, 0.47), "Brass_Satin", 0.014)
    box(c, "Shop_Counter_Display", (1.55, 0.68, 0.08), (0.66, 0.05, 1.02), "Glass_Clear", 0.04)
    box(c, "Shop_Counter_DisplayRail", (1.72, 0.76, 0.06), (0.66, 0.05, 0.96), "Metal_Charcoal", 0.025)


def create_study_shelf() -> None:
    c = module_collection("study-shelf")
    width = 3.6
    height = 3.25
    box(c, "Shelf_Back", (width, 0.16, height), (0, 0.2, height / 2), "Sage_Panel", 0.06)
    for x in (-width / 2 + 0.12, width / 2 - 0.12):
        box(c, f"Shelf_Side_{x}", (0.22, 0.62, height), (x, 0, height / 2), "Oak_Dark", 0.055)
    for index, z in enumerate((0.14, 0.92, 1.7, 2.48, 3.13)):
        box(c, f"Shelf_Board_{index + 1}", (width, 0.65, 0.13), (0, 0, z), "Oak_Warm", 0.045)
    palette = ("Plaster_WarmWhite", "Brass_Satin", "Sage_Fabric", "Oak_Dark", "Metal_Charcoal")
    randomizer = random.Random(71)
    for row in range(4):
        cursor = -1.48
        for item in range(7):
            book_width = randomizer.uniform(0.18, 0.36)
            book_height = randomizer.uniform(0.36, 0.62)
            box(
                c,
                f"Shelf_Book_{row}_{item}",
                (book_width, 0.34, book_height),
                (cursor + book_width / 2, -0.18, 0.22 + row * 0.78 + book_height / 2),
                palette[(row + item) % len(palette)],
                0.025,
                rotation=(0, randomizer.uniform(-0.035, 0.035), randomizer.uniform(-0.04, 0.04)),
            )
            cursor += book_width + 0.08
    box(c, "Shelf_Base", (3.78, 0.74, 0.16), (0, 0, 0.08), "Metal_Charcoal", 0.055)
    box(c, "Shelf_Top_Light", (2.2, 0.16, 0.055), (0, -0.38, 3.02), "Light_Warm", 0.018)


def create_architectural_planter() -> None:
    c = module_collection("architectural-planter")
    box(c, "Planter_Base", (1.15, 1.15, 0.72), (0, 0, 0.36), "Terrazzo_Greige", 0.12)
    box(c, "Planter_Rim", (1.28, 1.28, 0.16), (0, 0, 0.72), "Oak_Warm", 0.07)
    box(c, "Planter_Soil", (0.94, 0.94, 0.09), (0, 0, 0.79), "Oak_Dark", 0.035)
    stems = [
        (-0.18, 0.05, 1.72, -0.12),
        (0.16, -0.1, 1.5, 0.14),
        (0.02, 0.16, 1.92, 0.02),
        (-0.28, -0.16, 1.34, -0.22),
    ]
    for index, (x, y, top, lean) in enumerate(stems):
        depth = top - 0.78
        cylinder(
            c,
            f"Planter_Stem_{index + 1}",
            0.045,
            depth,
            (x, y, 0.78 + depth / 2),
            "Sage_Panel",
            rotation=(0, lean, 0),
            vertices=12,
        )
        for leaf_index, side in enumerate((-1, 1)):
            leaf = box(
                c,
                f"Planter_Leaf_{index + 1}_{leaf_index + 1}",
                (0.5, 0.2, 0.16),
                (x + side * 0.22, y, top - 0.18 - leaf_index * 0.18),
                "Sage_Fabric" if (index + leaf_index) % 2 else "Sage_Panel",
                0.08,
                rotation=(0, side * 0.28, side * 0.36),
            )
    cylinder(c, "Planter_Brass_Pin", 0.07, 0.05, (0.42, -0.6, 0.38), "Brass_Satin", rotation=(math.pi / 2, 0, 0), vertices=16)


def create_modules() -> None:
    create_wall_solid()
    create_wall_door()
    create_wall_window()
    create_floor_panel()
    create_ceiling_panel()
    create_column()
    create_railing()
    create_stair_flight()
    create_stair_landing()
    create_stairwell_portal()
    create_elevator_shaft_shell()
    create_elevator_portal()
    create_elevator_door_panel()
    create_elevator_cabin_shell()
    create_reception_desk()
    create_built_in_bench()
    create_entry_portal()
    create_giant_screen_surround()
    create_study_workstation()
    create_shop_counter()
    create_study_shelf()
    create_architectural_planter()


def collection_objects(collection: bpy.types.Collection) -> list[bpy.types.Object]:
    result = list(collection.objects)
    for child in collection.children:
        result.extend(collection_objects(child))
    return result


def export_modules() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    for module_name, collection in MODULES.items():
        bpy.ops.object.select_all(action="DESELECT")
        objects = collection_objects(collection)
        for obj in objects:
            obj.select_set(True)
        if not objects:
            continue
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.export_scene.gltf(
            filepath=str(EXPORT_DIR / f"{module_name}.glb"),
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
    reset_scene()
    create_materials()
    create_modules()
    bpy.context.scene["asset_library"] = "Estudiemos Room Architecture"
    bpy.context.scene["units"] = "meters"
    bpy.context.scene["export_format"] = "glTF 2.0 binary"
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), compress=True)
    export_modules()
    print(f"Created {len(MODULES)} architecture modules in {EXPORT_DIR}")


if __name__ == "__main__":
    main()
