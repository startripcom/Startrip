#!/usr/bin/env python3
"""
Generates the high-resolution Open Graph 1200x630 preview image for StarTip Landing Page.
Designed with crisp geometric vector iconography, neon glowing accents, and typography.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 1200
HEIGHT = 630

def draw_lightning(draw, x, y, size=20, fill=(198, 255, 61, 255)):
    """Draws a crisp, stylized lightning bolt polygon."""
    s = size / 20.0
    pts = [
        (x + 11 * s, y + 0 * s),
        (x + 3 * s, y + 10 * s),
        (x + 9 * s, y + 10 * s),
        (x + 7 * s, y + 20 * s),
        (x + 17 * s, y + 8 * s),
        (x + 11 * s, y + 8 * s),
    ]
    draw.polygon(pts, fill=fill)

def draw_star(draw, x, y, r=8, fill=(199, 210, 254, 255)):
    """Draws a four-point cosmic star / sparkle."""
    pts = [
        (x, y - r), (x + r * 0.3, y - r * 0.3),
        (x + r, y), (x + r * 0.3, y + r * 0.3),
        (x, y + r), (x - r * 0.3, y + r * 0.3),
        (x - r, y), (x - r * 0.3, y - r * 0.3)
    ]
    draw.polygon(pts, fill=fill)

def draw_live_dot(draw, x, y, r=5, fill=(244, 63, 94, 255)):
    """Draws a pulsing live alert indicator."""
    draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=fill)

def draw_card_chip(draw, x, y, w=14, h=10, fill=(129, 140, 248, 255)):
    """Draws a mini payment card/chip icon."""
    draw.rounded_rectangle([(x, y), (x + w, y + h)], radius=2, outline=fill, width=1)
    draw.line([(x + 2, y + 4), (x + w - 2, y + 4)], fill=fill, width=1)

def create_landing_og():
    # 1. Base dark canvas #070A1A
    img = Image.new("RGBA", (WIDTH, HEIGHT), (7, 10, 26, 255))
    
    # 2. Add atmospheric lighting (radial gradients)
    glow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    # Top-right Lime glow (#C6FF3D)
    lime_center = (960, 90)
    for r in range(420, 0, -8):
        alpha = int(48 * (1 - r / 420.0) ** 1.7)
        glow_draw.ellipse(
            (lime_center[0] - r, lime_center[1] - r, lime_center[0] + r, lime_center[1] + r),
            fill=(198, 255, 61, alpha)
        )
        
    # Bottom-left Purple glow (#6366F1)
    purple_center = (180, 520)
    for r in range(520, 0, -10):
        alpha = int(58 * (1 - r / 520.0) ** 1.6)
        glow_draw.ellipse(
            (purple_center[0] - r, purple_center[1] - r, purple_center[0] + r, purple_center[1] + r),
            fill=(99, 102, 241, alpha)
        )

    # Top-center soft cyan glow
    cyan_center = (560, 50)
    for r in range(360, 0, -10):
        alpha = int(32 * (1 - r / 360.0) ** 2)
        glow_draw.ellipse(
            (cyan_center[0] - r, cyan_center[1] - r, cyan_center[0] + r, cyan_center[1] + r),
            fill=(56, 189, 248, alpha)
        )
        
    # Composite glow onto base
    img = Image.alpha_composite(img, glow_layer)
    
    # 3. Add subtle tech grid background
    grid_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    grid_step = 40
    for x in range(0, WIDTH, grid_step):
        grid_draw.line([(x, 0), (x, HEIGHT)], fill=(255, 255, 255, 6), width=1)
    for y in range(0, HEIGHT, grid_step):
        grid_draw.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 6), width=1)
    img = Image.alpha_composite(img, grid_layer)
    
    # 4. Drawing text & UI components
    draw = ImageDraw.Draw(img)
    
    # Fonts
    font_dir = "/home/lucifer/Desktop/Startip/backend/static/fonts"
    font_bold = os.path.join(font_dir, "LiberationSans-Bold.ttf")
    font_reg = os.path.join(font_dir, "LiberationSans-Regular.ttf")
    
    f_pill = ImageFont.truetype(font_bold, 17)
    f_title = ImageFont.truetype(font_bold, 54)
    f_subtitle = ImageFont.truetype(font_reg, 23)
    f_card_title = ImageFont.truetype(font_bold, 21)
    f_card_desc = ImageFont.truetype(font_reg, 15)
    f_footer = ImageFont.truetype(font_bold, 18)
    f_footer_sub = ImageFont.truetype(font_reg, 16)
    
    # Outer ambient border
    draw.rounded_rectangle([(18, 18), (WIDTH - 18, HEIGHT - 18)], radius=24, outline=(255, 255, 255, 28), width=1)

    # Top Brand Header
    lx, ly = 70, 58
    
    # Left Pill: Logo + Brand
    pill_text = "STARTIP  •  INSTANT CREATOR TIPS"
    pill_bbox = draw.textbbox((0, 0), pill_text, font=f_pill)
    pw = pill_bbox[2] - pill_bbox[0] + 62
    ph = 42
    draw.rounded_rectangle([(lx, ly), (lx + pw, ly + ph)], radius=21, fill=(198, 255, 61, 28), outline=(198, 255, 61, 150), width=1)
    # Draw vector lightning bolt
    draw_lightning(draw, lx + 16, ly + 11, size=20, fill=(198, 255, 61, 255))
    draw.text((lx + 44, ly + 11), pill_text, font=f_pill, fill=(198, 255, 61, 255))
    
    # Right Pill: Powered by Stellar Soroban
    st_text = "Powered by Stellar Soroban"
    st_bbox = draw.textbbox((0, 0), st_text, font=f_pill)
    sw = st_bbox[2] - st_bbox[0] + 56
    sx = WIDTH - 70 - sw
    draw.rounded_rectangle([(sx, ly), (sx + sw, ly + ph)], radius=21, fill=(99, 102, 241, 35), outline=(99, 102, 241, 150), width=1)
    draw_star(draw, sx + 22, ly + 21, r=9, fill=(199, 210, 254, 255))
    draw.text((sx + 38, ly + 11), st_text, font=f_pill, fill=(224, 231, 255, 255))

    # Main Headline
    ty = 138
    line1 = "Turn Appreciation Into Instant Tips"
    draw.text((lx, ty), line1, font=f_title, fill=(255, 255, 255, 255))
    
    # Tagline / Subtitle
    sub_y = ty + 74
    line2 = "The non-custodial tipping platform for streamers, developers & creators."
    line3 = "Fans pay in a tap with XLM or USDC. Tips land directly in your wallet with real-time OBS alerts."
    draw.text((lx, sub_y), line2, font=f_subtitle, fill=(203, 213, 225, 255))
    draw.text((lx, sub_y + 34), line3, font=f_subtitle, fill=(148, 163, 184, 255))
    
    # Three Feature Highlight Cards
    card_y = 312
    card_w = 330
    card_h = 175
    gap = 35
    
    cards_data = [
        {
            "badge_type": "lightning",
            "badge": "ZERO CUSTODY",
            "badge_col": (198, 255, 61),
            "title": "Direct to Your Wallet",
            "desc": "Tips settle in under 5 seconds via Stellar Soroban. Zero intermediaries, zero holdbacks.",
        },
        {
            "badge_type": "live",
            "badge": "LIVE OVERLAY",
            "badge_col": (244, 63, 94),
            "title": "OBS & Stream Alerts",
            "desc": "Broadcast real-time tipping alerts with custom animations and dynamic supporter remarks.",
        },
        {
            "badge_type": "card",
            "badge": "1-TAP CHECKOUT",
            "badge_col": (129, 140, 248),
            "title": "Universal Tip Widget",
            "desc": "Embed anywhere or share your link. Supports Freighter, Albedo, LOBSTR and QR codes.",
        }
    ]
    
    b_font = ImageFont.truetype(font_bold, 12)
    
    for idx, c in enumerate(cards_data):
        cx = lx + idx * (card_w + gap)
        # Card background & border
        draw.rounded_rectangle(
            [(cx, card_y), (cx + card_w, card_y + card_h)],
            radius=18,
            fill=(14, 19, 51, 230),
            outline=(255, 255, 255, 30),
            width=1
        )
        
        # Mini Badge
        b_text = c["badge"]
        b_bbox = draw.textbbox((0, 0), b_text, font=b_font)
        bw = b_bbox[2] - b_bbox[0] + 32
        bh = 24
        draw.rounded_rectangle(
            [(cx + 18, card_y + 16), (cx + 18 + bw, card_y + 16 + bh)],
            radius=6,
            fill=(*c["badge_col"], 30),
            outline=(*c["badge_col"], 120),
            width=1
        )
        
        # Mini icon inside badge
        if c["badge_type"] == "lightning":
            draw_lightning(draw, cx + 24, card_y + 20, size=14, fill=(*c["badge_col"], 255))
        elif c["badge_type"] == "live":
            draw_live_dot(draw, cx + 29, card_y + 28, r=4, fill=(*c["badge_col"], 255))
        elif c["badge_type"] == "card":
            draw_card_chip(draw, cx + 24, card_y + 23, w=12, h=9, fill=(*c["badge_col"], 255))
            
        draw.text((cx + 42, card_y + 20), b_text, font=b_font, fill=(*c["badge_col"], 255))
        
        # Card title & desc
        draw.text((cx + 18, card_y + 54), c["title"], font=f_card_title, fill=(255, 255, 255, 255))
        
        # Wrapped description
        desc_lines = []
        words = c["desc"].split()
        curr = ""
        for w in words:
            test = (curr + " " + w).strip()
            if draw.textbbox((0, 0), test, font=f_card_desc)[2] < (card_w - 36):
                curr = test
            else:
                desc_lines.append(curr)
                curr = w
        if curr:
            desc_lines.append(curr)
            
        for line_idx, line in enumerate(desc_lines[:3]):
            draw.text((cx + 18, card_y + 88 + line_idx * 22), line, font=f_card_desc, fill=(160, 170, 200, 255))

    # Bottom Bar / Footer
    foot_y = 530
    draw.line([(lx, foot_y), (WIDTH - lx, foot_y)], fill=(255, 255, 255, 22), width=1)
    
    # URL pill
    url_text = "startip.app"
    draw_lightning(draw, lx, foot_y + 23, size=18, fill=(198, 255, 61, 255))
    draw.text((lx + 24, foot_y + 22), url_text, font=f_footer, fill=(255, 255, 255, 255))
    draw.text((lx + 130, foot_y + 24), "— One link for your bio, stream & website", font=f_footer_sub, fill=(148, 163, 184, 255))

    # Right footer: XLM + USDC supported
    curr_text = "Supported Assets: XLM  •  USDC"
    curr_bbox = draw.textbbox((0, 0), curr_text, font=f_footer)
    cw = curr_bbox[2] - curr_bbox[0]
    draw.text((WIDTH - lx - cw, foot_y + 22), curr_text, font=f_footer, fill=(198, 255, 61, 255))

    return img

if __name__ == "__main__":
    og = create_landing_og()
    out1 = "/home/lucifer/Desktop/Startip/frontend/public/og-preview.png"
    out2 = "/home/lucifer/Desktop/Startip/backend/static/og-preview.png"
    og.save(out1, "PNG", optimize=True)
    og.save(out2, "PNG", optimize=True)
    print(f"Generated landing page OG preview successfully: {out1} & {out2}")
