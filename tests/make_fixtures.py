"""
生成端到端测试用的样本文件，覆盖各工具的真实输入形态。
输出目录：tests/fixtures
"""
import io
import json
import os
import struct
import zipfile

from PIL import Image, ImageDraw, ImageFont
from docx import Document

OUT = os.path.join("tests", "fixtures")
os.makedirs(OUT, exist_ok=True)


def font(size=32):
    for name in (
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ):
        if os.path.exists(name):
            try:
                return ImageFont.truetype(name, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_image(name, size, color, text, fmt="PNG"):
    img = Image.new("RGB", size, color)
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, size[0] - 10, size[1] - 10], outline=(30, 30, 30), width=3)
    d.text((28, size[1] // 2 - 20), text, fill=(20, 20, 20), font=font(36))
    path = os.path.join(OUT, name)
    img.save(path, fmt)
    return path


# ---------- PDF：手写最小 PDF，含多页与文字 ----------
def build_pdf(path, pages):
    """pages: list[str]，每页一段文字（Helvetica 可显示）"""
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
    for i, text in enumerate(pages):
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


# ---------- DOCX ----------
def build_docx(path):
    doc = Document()
    doc.add_heading("Quarterly Report", level=1)
    doc.add_paragraph("This document is generated for automated end-to-end testing.")
    doc.add_paragraph("第二段用于验证中文提取（内容可能无法写入 PDF 字体）。")
    doc.add_heading("Numbers", level=2)
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Item"
    table.cell(0, 1).text = "Value"
    table.cell(1, 0).text = "Revenue"
    table.cell(1, 1).text = "1280"
    doc.save(path)
    return path


# ---------- 其它文本类样本 ----------
def write_text(name, content):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    return path


def main():
    made = []

    made.append(build_pdf(os.path.join(OUT, "doc-3pages.pdf"), ["Page 1 alpha", "Page 2 beta", "Page 3 gamma"]))
    made.append(build_pdf(os.path.join(OUT, "doc-2pages.pdf"), ["Second doc page 1", "Second doc page 2"]))
    made.append(build_pdf(os.path.join(OUT, "doc-1page.pdf"), ["Single page only"]))

    made.append(make_image("photo.png", (800, 600), (240, 120, 40), "TEST PNG"))
    made.append(make_image("photo.jpg", (1200, 800), (30, 90, 200), "TEST JPG", "JPEG"))
    made.append(make_image("small.png", (120, 90), (200, 200, 60), "SMALL PNG"))
    made.append(make_image("wide.webp", (1600, 400), (60, 160, 120), "TEST WEBP", "WEBP"))
    made.append(make_image("icon-square.png", (512, 512), (250, 250, 250), "ICON"))

    # 带白色背景的证件照样式，用于去底
    card = Image.new("RGB", (400, 500), (255, 255, 255))
    d = ImageDraw.Draw(card)
    d.ellipse([120, 90, 280, 250], fill=(235, 200, 170))
    d.rectangle([110, 260, 290, 470], fill=(70, 110, 170))
    card.save(os.path.join(OUT, "id-photo.png"))

    made.append(build_docx(os.path.join(OUT, "report.docx")))

    made.append(
        write_text(
            "data.json",
            json.dumps(
                {
                    "name": "抹布工具箱",
                    "tools": 41,
                    "free": True,
                    "tags": ["pdf", "image", "ocr"],
                    "nested": {"a": 1, "b": [1, 2, 3]},
                },
                ensure_ascii=False,
                indent=2,
            ),
        )
    )
    made.append(write_text("messy.txt", "  alpha  \n\n\nbeta\nbeta\ngamma   \n\n  delta\n"))
    made.append(
        write_text(
            "sample.md",
            "# 标题\n\n正文 **加粗** 与 `code`。\n\n- 项目一\n- 项目二\n\n| A | B |\n| - | - |\n| 1 | 2 |\n",
        )
    )

    for p in made:
        print(f"{os.path.getsize(p):>9}  {p}")


if __name__ == "__main__":
    main()
