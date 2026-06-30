from PIL import Image
import os

img_dir = os.path.expanduser("~/Documents/02 个人文档/07 扫码点餐/menu-app/public/images")
total_before = 0
total_after = 0

for fname in os.listdir(img_dir):
    if not fname.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue
    path = os.path.join(img_dir, fname)
    before = os.path.getsize(path)
    total_before += before

    img = Image.open(path)
    # 转为 RGB（处理 PNG 透明图）
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGBA').convert('RGB')

    # 最大宽度 600px，保持比例
    if img.width > 600:
        ratio = 600 / img.width
        img = img.resize((600, int(img.height * ratio)), Image.LANCZOS)

    img.save(path, 'JPEG', quality=70, optimize=True)
    after = os.path.getsize(path)
    total_after += after
    pct = (1 - after/before) * 100
    print(f"  {fname}: {before//1024}KB → {after//1024}KB (-{pct:.0f}%)")

print(f"\n总计: {total_before//1024}KB → {total_after//1024}KB ({total_after/total_before*100:.0f}%)")
