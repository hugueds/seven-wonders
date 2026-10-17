from pathlib import Path
import struct
import zlib


def png_icon(size: int, destination: Path) -> None:
    scale = size / 512
    pixels = bytearray()
    dark = (23, 47, 48)
    inner = (32, 63, 62)
    gold = (211, 181, 109)
    ivory = (234, 223, 190)

    def inside_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
        inside = False
        j = len(points) - 1
        for i, (xi, yi) in enumerate(points):
            xj, yj = points[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
        return inside

    def color_at(x: int, y: int) -> tuple[int, int, int]:
        px, py = (x + 0.5) / scale, (y + 0.5) / scale
        dx, dy = px - 256, py - 256
        distance = (dx * dx + dy * dy) ** 0.5
        if distance < 194:
            color = inner
        else:
            color = dark
        if 194 <= distance <= 200:
            color = gold

        shapes = [
            (gold, [(137, 198), (256, 112), (375, 198), (375, 218), (137, 218)]),
            (ivory, [(151, 228), (361, 228), (361, 254), (151, 254)]),
            (ivory, [(164, 365), (348, 365), (348, 392), (164, 392)]),
            (ivory, [(143, 402), (369, 402), (369, 425), (143, 425)]),
        ]
        shapes.extend((ivory, [(left, 262), (left + 25, 262), (left + 25, 357), (left, 357)]) for left in (175, 226, 277, 328))
        for shape_color, polygon in shapes:
            if inside_polygon(px, py, polygon):
                color = shape_color
        return color

    for y in range(size):
        pixels.append(0)
        for x in range(size):
            pixels.extend(color_at(x, y))

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    image = b"\x89PNG\r\n\x1a\n"
    image += chunk(b"IHDR", struct.pack(">2I5B", size, size, 8, 2, 0, 0, 0))
    image += chunk(b"IDAT", zlib.compress(bytes(pixels), 9))
    image += chunk(b"IEND", b"")
    destination.write_bytes(image)


if __name__ == "__main__":
    icon_dir = Path(__file__).resolve().parent.parent / "public" / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    png_icon(192, icon_dir / "app-icon-192.png")
    png_icon(512, icon_dir / "app-icon-512.png")
