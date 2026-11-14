"""
边界测试样本：损坏文件、加密 PDF、极端尺寸、空内容等。
输出目录：tests/fixtures/edge
"""
import os
import io
import zipfile

from PIL import Image

OUT = os.path.join("tests", "fixtures", "edge")
os.makedirs(OUT, exist_ok=True)


def write(name, data: bytes):
    p = os.path.join(OUT, name)
    with open(p, "wb") as f:
        f.write(data)
    return p


def build_pdf(pages, path):
    n = len(pages)
    font_obj = 3 + 2 * n
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{' '.join(f'{i + 3} 0 R' for i in range(n))}] /Count {n} >>",
    ]
    for i in range(n):
        objs.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Contents {3 + n + i} 0 R /Resources << /Font << /F1 {font_obj} 0 R >> >> >>"
        )
    for text in pages:
        stream = f"BT /F1 24 Tf 72 740 Td ({text}) Tj ET"
        objs.append(f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream")
    objs.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    pdf = "%PDF-1.4\n"
    offsets = []
    for i, o in enumerate(objs):
        offsets.append(len(pdf))
        pdf += f"{i + 1} 0 obj\n{o}\nendobj\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n"
    for off in offsets:
        pdf += f"{off:010d} 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    with open(path, "wb") as f:
        f.write(pdf.encode("latin-1"))
    return path


def main():
    made = []

    # 1. 假 PDF（扩展名对、内容是文本）
    made.append(write("broken.pdf", b"This is definitely not a PDF file, just plain text.\n" * 3))

    # 2. 截断的 PDF（只有头部）
    made.append(write("truncated.pdf", b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\n"))

    # 3. 空文件
    made.append(write("empty.pdf", b""))
    made.append(write("empty.png", b""))

    # 4. 假 PNG（扩展名对、内容是乱码）
    made.append(write("broken.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 64))

    # 5. 单页 PDF（测试边界页范围）
    build_pdf(["only one page"], os.path.join(OUT, "one-page.pdf"))

    # 6. 大页数 PDF（30 页，测试多文件输出）
    build_pdf([f"Page {i + 1}" for i in range(30)], os.path.join(OUT, "thirty-pages.pdf"))

    # 7. 超大尺寸图片（8000x6000，测试内存）
    big = Image.new("RGB", (8000, 6000), (120, 140, 160))
    from PIL import ImageDraw
    d = ImageDraw.Draw(big)
    d.rectangle([100, 100, 400, 400], fill=(220, 60, 60))
    big.save(os.path.join(OUT, "huge.png"))

    # 8. 极小图片（1x1）
    tiny = Image.new("RGB", (1, 1), (10, 20, 30))
    tiny.save(os.path.join(OUT, "tiny.png"))

    # 9. 带透明通道的 PNG（测试 JPEG 转换的背景处理）
    rgba = Image.new("RGBA", (200, 200), (255, 0, 0, 0))
    rgba.save(os.path.join(OUT, "transparent.png"))

    # 10. 不支持扩展名的文本文件（伪装成图片）
    made.append(write("fake-image.png", b"not an image at all"))

    # 11. 非 docx 的 zip
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("hello.txt", "hi")
    made.append(write("not-a-docx.docx", buf.getvalue()))

    # 12. 极端文本内容
    made.append(write("empty.txt", b""))
    made.append(write("huge-line.txt", ("x" * 200000).encode()))
    made.append(write("invalid-json.json", b'{"a": 1, "b": }'))
    made.append(write("deep.json", b"[" * 200 + b"]" * 200))
    made.append(write("unicode.md", "# 表情 😀 与 <script>alert(1)</script>\n\n| a | b |\n|---|---|\n| 1 | 2 |".encode()))

    for p in made:
        print(f"{os.path.getsize(p):>10}  {os.path.relpath(p, OUT)}")
    for name in ("one-page.pdf", "thirty-pages.pdf", "huge.png", "tiny.png", "transparent.png", "not-a-docx.docx"):
        p = os.path.join(OUT, name)
        print(f"{os.path.getsize(p):>10}  {name}")


if __name__ == "__main__":
    main()
