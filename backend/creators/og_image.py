"""
Dynamic Open Graph Social Preview Image Generator for StarTip Creators.
Generates an eye-catching 1200x630 social card for any creator profile.
"""
import io
import os
import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

WIDTH = 1200
HEIGHT = 630

def draw_lightning(draw, x, y, size=20, fill=(198, 255, 61, 255)):
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
    pts = [
        (x, y - r), (x + r * 0.3, y - r * 0.3),
        (x + r, y), (x + r * 0.3, y + r * 0.3),
        (x, y + r), (x - r * 0.3, y + r * 0.3),
        (x - r, y), (x - r * 0.3, y - r * 0.3)
    ]
    draw.polygon(pts, fill=fill)

def draw_live_dot(draw, x, y, r=5, fill=(244, 63, 94, 255)):
    draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=fill)

def get_font(name="bold", size=20):
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "static", "fonts", "LiberationSans-Bold.ttf" if name == "bold" else "LiberationSans-Regular.ttf"),
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if name == "bold" else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if name == "bold" else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def fetch_or_generate_avatar(avatar_url, display_name, size=140):
    """
    Attempts to fetch avatar from URL or local media, falls back to initials badge.
    """
    if avatar_url:
        try:
            if avatar_url.startswith("http://") or avatar_url.startswith("https://"):
                resp = requests.get(avatar_url, timeout=3)
                if resp.status_code == 200:
                    raw = Image.open(io.BytesIO(resp.content)).convert("RGBA")
                    raw = ImageOps.fit(raw, (size, size), Image.Resampling.LANCZOS)
                    mask = Image.new("L", (size, size), 0)
                    draw_mask = ImageDraw.Draw(mask)
                    draw_mask.ellipse((0, 0, size, size), fill=255)
                    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                    output.paste(raw, (0, 0), mask=mask)
                    # Add border
                    draw_out = ImageDraw.Draw(output)
                    draw_out.ellipse((0, 0, size - 1, size - 1), outline=(198, 255, 61, 230), width=4)
                    return output
            elif os.path.exists(avatar_url):
                raw = Image.open(avatar_url).convert("RGBA")
                raw = ImageOps.fit(raw, (size, size), Image.Resampling.LANCZOS)
                mask = Image.new("L", (size, size), 0)
                draw_mask = ImageDraw.Draw(mask)
                draw_mask.ellipse((0, 0, size, size), fill=255)
                output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                output.paste(raw, (0, 0), mask=mask)
                draw_out = ImageDraw.Draw(output)
                draw_out.ellipse((0, 0, size - 1, size - 1), outline=(198, 255, 61, 230), width=4)
                return output
        except Exception:
            pass

    # Stylish Initials Circle with rich indigo-violet background and lime border
    av = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    av_draw = ImageDraw.Draw(av)
    
    # Outer circle
    av_draw.ellipse((0, 0, size - 1, size - 1), fill=(79, 70, 229, 255), outline=(198, 255, 61, 255), width=4)
    
    # Initials
    parts = (display_name or "Creator").split()
    initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "ST"
    f_init = get_font("bold", int(size * 0.40))
    bbox = av_draw.textbbox((0, 0), initials, font=f_init)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    av_draw.text(((size - tw) // 2, (size - th) // 2 - 4), initials, font=f_init, fill=(255, 255, 255, 255))
    return av

def generate_creator_og_image(creator):
    """
    Renders 1200x630 Open Graph preview card for a specific creator.
    """
    img = Image.new("RGBA", (WIDTH, HEIGHT), (7, 10, 26, 255))
    
    # Atmospheric lighting
    glow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    # Top-right Lime glow (#C6FF3D)
    lime_center = (980, 80)
    for r in range(420, 0, -8):
        alpha = int(48 * (1 - r / 420.0) ** 1.7)
        glow_draw.ellipse(
            (lime_center[0] - r, lime_center[1] - r, lime_center[0] + r, lime_center[1] + r),
            fill=(198, 255, 61, alpha)
        )
        
    # Center-left Purple glow (#6366F1)
    purple_center = (240, 320)
    for r in range(500, 0, -10):
        alpha = int(52 * (1 - r / 500.0) ** 1.6)
        glow_draw.ellipse(
            (purple_center[0] - r, purple_center[1] - r, purple_center[0] + r, purple_center[1] + r),
            fill=(99, 102, 241, alpha)
        )

    img = Image.alpha_composite(img, glow_layer)
    
    # Tech grid lines
    grid_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_layer)
    for x in range(0, WIDTH, 40):
        grid_draw.line([(x, 0), (x, HEIGHT)], fill=(255, 255, 255, 6), width=1)
    for y in range(0, HEIGHT, 40):
        grid_draw.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 6), width=1)
    img = Image.alpha_composite(img, grid_layer)
    
    draw = ImageDraw.Draw(img)
    
    # Fonts
    f_pill = get_font("bold", 17)
    f_name = get_font("bold", 46)
    f_handle = get_font("bold", 25)
    f_bio = get_font("reg", 21)
    f_badge = get_font("bold", 15)
    f_footer = get_font("bold", 18)
    f_footer_sub = get_font("reg", 16)
    
    # Outer ambient border
    draw.rounded_rectangle([(18, 18), (WIDTH - 18, HEIGHT - 18)], radius=24, outline=(255, 255, 255, 28), width=1)

    # Top Brand Header
    lx, ly = 70, 56
    
    # Left Pill: Logo + Brand
    pill_text = "STARTIP  •  CREATOR TIP LINK"
    pill_bbox = draw.textbbox((0, 0), pill_text, font=f_pill)
    pw = pill_bbox[2] - pill_bbox[0] + 62
    ph = 42
    draw.rounded_rectangle([(lx, ly), (lx + pw, ly + ph)], radius=21, fill=(20, 32, 25, 255), outline=(198, 255, 61, 160), width=1)
    draw_lightning(draw, lx + 16, ly + 11, size=20, fill=(198, 255, 61, 255))
    draw.text((lx + 44, ly + 11), pill_text, font=f_pill, fill=(198, 255, 61, 255))
    
    # Right Pill: Powered by Stellar Soroban
    st_text = "Instant Stellar Tips"
    st_bbox = draw.textbbox((0, 0), st_text, font=f_pill)
    sw = st_bbox[2] - st_bbox[0] + 56
    sx = WIDTH - 70 - sw
    draw.rounded_rectangle([(sx, ly), (sx + sw, ly + ph)], radius=21, fill=(25, 27, 58, 255), outline=(99, 102, 241, 160), width=1)
    draw_star(draw, sx + 22, ly + 21, r=9, fill=(199, 210, 254, 255))
    draw.text((sx + 38, ly + 11), st_text, font=f_pill, fill=(224, 231, 255, 255))

    # Center Hero Card
    hero_x = lx
    hero_y = 126
    hero_w = WIDTH - (lx * 2)
    hero_h = 380
    
    draw.rounded_rectangle(
        [(hero_x, hero_y), (hero_x + hero_w, hero_y + hero_h)],
        radius=24,
        fill=(14, 19, 51, 240),
        outline=(255, 255, 255, 35),
        width=1
    )
    
    # Creator Avatar
    avatar_size = 140
    av_x = hero_x + 40
    av_y = hero_y + 40
    
    avatar_img = fetch_or_generate_avatar(
        getattr(creator, "avatar_url", ""),
        getattr(creator, "display_name", "Creator"),
        size=avatar_size
    )
    img.paste(avatar_img, (av_x, av_y), mask=avatar_img)
    
    # Content beside avatar
    content_x = av_x + avatar_size + 36
    name_y = av_y + 4
    
    display_name = getattr(creator, "display_name", "Creator") or "Creator"
    draw.text((content_x, name_y), display_name, font=f_name, fill=(255, 255, 255, 255))
    
    # Handle with glowing badge
    username = getattr(creator, "username", "creator")
    handle_text = f"@{username}"
    handle_y = name_y + 58
    draw.text((content_x, handle_y), handle_text, font=f_handle, fill=(198, 255, 61, 255))
    
    # Verified Creator Pill
    v_text = "Verified Creator"
    f_v = get_font("bold", 13)
    v_bbox = draw.textbbox((0, 0), v_text, font=f_v)
    h_bbox = draw.textbbox((0, 0), handle_text, font=f_handle)
    vx = content_x + (h_bbox[2] - h_bbox[0]) + 16
    vy = handle_y + 3
    vw = v_bbox[2] - v_bbox[0] + 28
    vh = 24
    draw.rounded_rectangle([(vx, vy), (vx + vw, vy + vh)], radius=12, fill=(18, 48, 28, 255), outline=(34, 197, 94, 160), width=1)
    draw_star(draw, vx + 12, vy + 12, r=5, fill=(34, 197, 94, 255))
    draw.text((vx + 22, vy + 4), v_text, font=f_v, fill=(134, 239, 172, 255))

    # Bio / Welcome Message
    bio = getattr(creator, "bio", "")
    if not bio:
        w_cfg = getattr(creator, "widget_config", None)
        if w_cfg and getattr(w_cfg, "welcome_message", ""):
            bio = w_cfg.welcome_message
    if not bio:
        bio = "Send instant non-custodial tips in XLM or USDC directly to my Stellar wallet with live on-stream alerts."
        
    bio_y = handle_y + 44
    max_w = hero_w - (content_x - hero_x) - 40
    
    bio_lines = []
    words = bio.split()
    curr_line = ""
    for w in words:
        test = (curr_line + " " + w).strip()
        if draw.textbbox((0, 0), test, font=f_bio)[2] < max_w:
            curr_line = test
        else:
            bio_lines.append(curr_line)
            curr_line = w
            if len(bio_lines) >= 3:
                break
    if curr_line and len(bio_lines) < 3:
        bio_lines.append(curr_line)
        
    for i, line in enumerate(bio_lines[:3]):
        draw.text((content_x, bio_y + i * 28), line, font=f_bio, fill=(203, 213, 225, 255))

    # Divider inside Hero Card
    div_y = hero_y + 246
    draw.line([(hero_x + 36, div_y), (hero_x + hero_w - 36, div_y)], fill=(255, 255, 255, 22), width=1)
    
    # 3 Feature Pills at bottom of hero card (solid dark backgrounds with crisp colored outlines)
    pill_row_y = div_y + 24
    
    pills = [
        {"icon": "lightning", "text": "Direct to Creator Wallet", "bg": (20, 32, 25), "col": (198, 255, 61)},
        {"icon": "live", "text": "Real-time OBS Stream Alerts", "bg": (38, 18, 28), "col": (244, 63, 94)},
        {"icon": "star", "text": "Accepts XLM & USDC", "bg": (24, 25, 56), "col": (129, 140, 248)},
    ]
    
    px = hero_x + 36
    for p in pills:
        t_bbox = draw.textbbox((0, 0), p["text"], font=f_badge)
        pw = t_bbox[2] - t_bbox[0] + 54
        ph = 38
        draw.rounded_rectangle([(px, pill_row_y), (px + pw, pill_row_y + ph)], radius=19, fill=(*p["bg"], 255), outline=(*p["col"], 160), width=1)
        if p["icon"] == "lightning":
            draw_lightning(draw, px + 15, pill_row_y + 10, size=18, fill=(*p["col"], 255))
        elif p["icon"] == "live":
            draw_live_dot(draw, px + 22, pill_row_y + 19, r=5, fill=(*p["col"], 255))
        elif p["icon"] == "star":
            draw_star(draw, px + 22, pill_row_y + 19, r=7, fill=(*p["col"], 255))
        draw.text((px + 38, pill_row_y + 10), p["text"], font=f_badge, fill=(245, 248, 255, 255))
        px += pw + 20

    # Bottom Footer Outside Hero Card
    foot_y = 536
    url_tip = f"startip.app/tip/{username}"
    draw_lightning(draw, lx, foot_y + 21, size=18, fill=(198, 255, 61, 255))
    draw.text((lx + 24, foot_y + 20), url_tip, font=f_footer, fill=(255, 255, 255, 255))
    sub_text = "— Tip in 1-tap with Freighter, Albedo & LOBSTR"
    tip_len = draw.textbbox((0, 0), url_tip, font=f_footer)[2]
    draw.text((lx + 32 + tip_len, foot_y + 22), sub_text, font=f_footer_sub, fill=(148, 163, 184, 255))

    # Right footer badge with lightning bolt
    rx = WIDTH - lx - 230
    draw_lightning(draw, rx, foot_y + 21, size=18, fill=(198, 255, 61, 255))
    draw.text((rx + 24, foot_y + 20), "Zero Intermediary Fees", font=f_footer, fill=(198, 255, 61, 255))

    return img

def render_creator_og_bytes(creator):
    img = generate_creator_og_image(creator)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
