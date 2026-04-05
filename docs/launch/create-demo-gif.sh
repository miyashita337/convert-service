#!/usr/bin/env bash
# QuickConv デモGIF作成スクリプト
#
# 前提条件:
#   - ffmpeg (brew install ffmpeg)
#   - scrcpy or built-in macOS screencapture
#
# 使用方法:
#   1. Chrome で https://quickconv.cc/en/convert/png-to-webp を開く
#   2. このスクリプトを実行: bash docs/launch/create-demo-gif.sh
#   3. 記録が開始したら、ブラウザで操作する:
#      a. ドロップゾーンにファイルをドラッグ
#      b. 変換完了画面を確認
#      c. Compare Quality ボタンをクリック
#      d. スライダーを操作して品質比較
#      e. Download ボタンをホバー
#   4. Ctrl+C で記録終了
#   5. GIFが docs/launch/quickconv-demo-manual.gif に保存される

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_GIF="${SCRIPT_DIR}/quickconv-demo-manual.gif"
FRAMES_DIR="$(mktemp -d)"
FPS=5
DURATION=15  # 秒
QUALITY=85   # 0-100

echo "=== QuickConv デモGIF作成 ==="
echo "出力先: ${OUTPUT_GIF}"
echo "フレームレート: ${FPS} fps"
echo "最大時間: ${DURATION} 秒"
echo ""

# 作業ディレクトリ確認
echo "一時ディレクトリ: ${FRAMES_DIR}"
echo ""

# サンプル画像作成（テスト用）
echo "[1/4] サンプルPNG画像を作成中..."
python3 -c "
import struct, zlib, math

def create_png(filename, width=800, height=600):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            # Sky gradient (top half)
            if y < height // 2:
                t = y / (height // 2)
                r = int(26 + (135 - 26) * t)
                g = int(107 + (206 - 107) * t)
                b = int(176 + (235 - 176) * t)
            else:
                # Ground (bottom half)
                t = (y - height // 2) / (height // 2)
                r = int(93 * (1-t) + 61 * t)
                g = int(158 * (1-t) + 122 * t)
                b = int(58 * (1-t) + 26 * t)

            # Mountain
            cx = width // 2
            peak_y = height // 4
            slope = abs(x - cx) / (cx * 0.8)
            mountain_y = peak_y + int(slope * (height // 2 - peak_y))
            if y > mountain_y and y < height // 2:
                r = int(120 + (x/width) * 40)
                g = 144
                b = 156

            # Sun
            sx, sy = int(width * 0.85), int(height * 0.15)
            dist = math.sqrt((x-sx)**2 + (y-sy)**2)
            if dist < 55:
                r, g, b = 255, 213, 79

            raw += bytes([min(255,r), min(255,g), min(255,b)])

    idat = chunk(b'IDAT', zlib.compress(raw, 6))
    iend = chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

    import os
    return os.path.getsize(filename)

size = create_png('/tmp/demo-sample.png')
print(f'作成完了: /tmp/demo-sample.png ({size/1024:.1f} KB)')
"

echo ""
echo "[2/4] ブラウザ操作の録画を開始します..."
echo "  Chrome ウィンドウを前面に出して操作してください"
echo ""
echo "推奨操作シナリオ (${DURATION}秒以内):"
echo "  0-2s:  quickconv.cc のトップを表示"
echo "  2-4s:  ファイルをドロップゾーンにドラッグ"
echo "  4-7s:  Processing... → Completed の変化を見せる"
echo "  7-10s: 完了画面 (73KB → 7KB -90%) を表示"
echo "  10-13s: Compare Quality をクリックしてスライダー操作"
echo "  13-15s: Download ボタンをホバー"
echo ""
echo "3秒後に録画開始... (Ctrl+C で終了)"
sleep 3

# macOS screencapture でスクリーン録画
# 注: 実際の録画には QuickTime Player または ffmpeg を使用
echo ""
echo "[録画方法の選択]"
echo ""

if command -v ffmpeg &>/dev/null; then
    # ffmpeg が使える場合はスクリーンキャプチャ
    echo "ffmpeg でスクリーンキャプチャを開始します..."
    echo "（Ctrl+C で終了）"
    echo ""

    # ディスプレイサイズを取得
    DISPLAY_SIZE=$(system_profiler SPDisplaysDataType 2>/dev/null | grep Resolution | head -1 | grep -oE '[0-9]+ x [0-9]+' | head -1 | tr ' x ' 'x' || echo "2560x1440")
    W=$(echo $DISPLAY_SIZE | cut -d'x' -f1)
    H=$(echo $DISPLAY_SIZE | cut -d'x' -f2)

    # Chrome ウィンドウ領域を自動検出（1280x800 想定）
    CROP_W=1280
    CROP_H=800
    CROP_X=$(( (W - CROP_W) / 2 ))
    CROP_Y=0

    echo "キャプチャ領域: ${CROP_W}x${CROP_H} at (${CROP_X}, ${CROP_Y})"
    echo ""

    # 録画
    VIDEO_FILE="${FRAMES_DIR}/recording.mp4"
    ffmpeg -f avfoundation -i "1" \
        -t ${DURATION} \
        -vf "crop=${CROP_W}:${CROP_H}:${CROP_X}:${CROP_Y},scale=1280:800:flags=lanczos" \
        -r ${FPS} \
        -c:v libx264 -pix_fmt yuv420p \
        "${VIDEO_FILE}" 2>/dev/null || {
        echo "録画失敗。Quicktime録画または手動キャプチャを使ってください。"
        exit 1
    }

    echo ""
    echo "[3/4] GIF変換中..."

    # 高品質GIFパレット生成
    ffmpeg -i "${VIDEO_FILE}" \
        -vf "fps=${FPS},scale=1280:-1:flags=lanczos,palettegen=stats_mode=diff" \
        "${FRAMES_DIR}/palette.png" -y 2>/dev/null

    # GIF生成
    ffmpeg -i "${VIDEO_FILE}" -i "${FRAMES_DIR}/palette.png" \
        -lavfi "fps=${FPS},scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
        "${OUTPUT_GIF}" -y 2>/dev/null

else
    echo "ffmpeg が見つかりません。インストール: brew install ffmpeg"
    echo ""
    echo "代替方法:"
    echo "  1. QuickTime Player → ファイル → 新規画面収録"
    echo "  2. Chrome ウィンドウを選択して録画"
    echo "  3. 録画を ~/Desktop/quickconv-recording.mov に保存"
    echo "  4. 以下のコマンドでGIF変換:"
    echo ""
    echo "     ffmpeg -i ~/Desktop/quickconv-recording.mov \\"
    echo "       -vf 'fps=5,scale=1280:-1:flags=lanczos,palettegen' /tmp/palette.png"
    echo "     ffmpeg -i ~/Desktop/quickconv-recording.mov -i /tmp/palette.png \\"
    echo "       -lavfi 'fps=5,scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse' \\"
    echo "       ${OUTPUT_GIF}"
    echo ""
    exit 0
fi

# ファイルサイズ確認
if [[ -f "${OUTPUT_GIF}" ]]; then
    GIF_SIZE=$(du -h "${OUTPUT_GIF}" | cut -f1)
    echo ""
    echo "[4/4] 完了!"
    echo "出力: ${OUTPUT_GIF}"
    echo "サイズ: ${GIF_SIZE}"
    echo ""

    # サイズチェック (5MB = 5120KB)
    GIF_SIZE_KB=$(du -k "${OUTPUT_GIF}" | cut -f1)
    if [[ ${GIF_SIZE_KB} -gt 5120 ]]; then
        echo "警告: ファイルサイズが5MBを超えています。最適化中..."
        OPTIMIZED="${OUTPUT_GIF%.gif}-optimized.gif"

        if command -v gifsicle &>/dev/null; then
            gifsicle --optimize=3 --colors 256 "${OUTPUT_GIF}" -o "${OPTIMIZED}"
            echo "最適化後: $(du -h "${OPTIMIZED}" | cut -f1)"
            mv "${OPTIMIZED}" "${OUTPUT_GIF}"
        else
            echo "  brew install gifsicle でさらに最適化できます"
        fi
    fi

    echo ""
    echo "GIFを開く:"
    echo "  open ${OUTPUT_GIF}"
    open "${OUTPUT_GIF}" 2>/dev/null || true
else
    echo "エラー: GIFの作成に失敗しました"
    exit 1
fi

# クリーンアップ
rm -rf "${FRAMES_DIR}"

echo ""
echo "=== 完了 ==="
echo "SNS投稿用GIF: ${OUTPUT_GIF}"
echo ""
echo "推奨投稿文:"
echo "  Twitter/X: PNG→WebPが1秒以内に-90%! quickconv.cc で無料変換"
echo "  Reddit: [Tool] QuickConv - Free PNG/HEIC/AVIF converter, no signup"
echo "  HN: Show HN: QuickConv – browser-side image format converter"
