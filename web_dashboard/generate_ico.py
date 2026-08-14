import os
from PIL import Image

def generate_ico():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_png_path = os.path.join(current_dir, 'public', 'logo_app.png')
    output_build_dir = os.path.join(current_dir, 'build')
    output_ico_path = os.path.join(output_build_dir, 'icon.ico')

    if not os.path.exists(input_png_path):
        print(f"Error: PNG file not found at {input_png_path}")
        return

    # Ensure build output directory exists
    os.makedirs(output_build_dir, exist_ok=True)

    print(f"Loading image from {input_png_path}...")
    img = Image.open(input_png_path)

    # Standard ICO sizes
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

    print(f"Saving icon file with multiple resolutions to {output_ico_path}...")
    img.save(output_ico_path, format='ICO', sizes=sizes)
    print("Successfully generated icon.ico!")

if __name__ == '__main__':
    generate_ico()
