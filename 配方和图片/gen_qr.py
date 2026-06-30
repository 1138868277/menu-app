import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import RadialGradiantColorMask
from PIL import Image, ImageDraw, ImageFont
import os

url = "https://1138868277.github.io/menu-app/preview/"
output_path = os.path.expanduser("~/Documents/02 个人文档/07 扫码点餐/配方和图片/菜单二维码_个性版.png")

# 生成 QR 码
qr = qrcode.QRCode(
    version=3,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=12,
    border=2,
)
qr.add_data(url)
qr.make(fit=True)

# 天蓝渐变：淡蓝中心 → 深海蓝边缘
img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(),
    color_mask=RadialGradiantColorMask(
        center_color=(100, 180, 255),       # 明亮天蓝中心
        edge_color=(30, 100, 200),           # 深海蓝边缘
    ),
    fill_color=(100, 180, 255),
    back_color=(245, 250, 255),             # 冰蓝白背景
)

img = img.convert("RGBA")

# ======== 在二维码中心叠加 "39" 标志 ========
qr_img_w, qr_img_h = img.size
logo_size = int(qr_img_w * 0.28)

logo_img = Image.new("RGBA", (logo_size, logo_size), (0, 0, 0, 0))
ldraw = ImageDraw.Draw(logo_img)

# 白色圆底 + 天蓝描边
ldraw.ellipse([2, 2, logo_size - 2, logo_size - 2], fill=(255, 255, 255, 245))
ldraw.ellipse([2, 2, logo_size - 2, logo_size - 2], outline=(70, 150, 230, 200), width=3)

try:
    font_size = int(logo_size * 0.5)
    font = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", font_size)
    text = "39"
    bbox = ldraw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (logo_size - tw) // 2
    ty = (logo_size - th) // 2 - 2
    ldraw.text((tx, ty), text, fill=(50, 130, 210, 230), font=font)
except:
    pass

logo_x = (qr_img_w - logo_size) // 2
logo_y = (qr_img_h - logo_size) // 2
img.paste(logo_img, (logo_x, logo_y), logo_img)

# ======== 扩大画布加白边 ========
padding_h = 40
padding_v = 60
new_size = (img.width + padding_h * 2, img.height + padding_v * 2)
canvas = Image.new("RGBA", new_size, (245, 250, 255, 255))
canvas.paste(img, (padding_h, padding_v), img)

draw = ImageDraw.Draw(canvas)

# 四角装饰（天蓝色）
color_accent = (70, 160, 230)
corner_len = 30
w, h = new_size

for (cx, cy, dx, dy) in [
    (padding_h, padding_v, 1, 1),
    (w - padding_h, padding_v, -1, 1),
    (padding_h, h - padding_v, 1, -1),
    (w - padding_h, h - padding_v, -1, -1),
]:
    draw.line([(cx, cy), (cx + dx * corner_len, cy)], fill=color_accent, width=4)
    draw.line([(cx, cy), (cx, cy + dy * corner_len)], fill=color_accent, width=4)

# 底部文字
try:
    font = ImageFont.truetype("/System/Library/Fonts/STHeiti Medium.ttc", 22)
    text = "39' mixology cafe"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (w - tw) // 2
    ty = h - padding_v + (padding_v - (bbox[3] - bbox[1])) // 2 - 4
    draw.text((tx, ty), text, fill=(60, 140, 210, 200), font=font)
except:
    pass

canvas.save(output_path)
print(f"✅ 个性二维码已生成: {output_path}")
