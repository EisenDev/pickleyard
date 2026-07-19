#!/usr/bin/env python3
import sys
import os

def install_and_import_qrcode():
    try:
        import qrcode
        return qrcode
    except ImportError:
        print("Installing dependency 'qrcode' and 'pillow'...")
        os.system(sys.executable + " -m pip install qrcode[pil]")
        import qrcode
        return qrcode

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate_qr.py <text_data> [output_filename.png]")
        sys.exit(1)
        
    data = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "qr_code.png"
    
    print(f"Generating QR Code for data: '{data}'")
    qrcode = install_and_import_qrcode()
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_file)
    print(f"Success! Saved QR Code image to: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    main()
