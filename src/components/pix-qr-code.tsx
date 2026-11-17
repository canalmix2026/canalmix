"use client";

import { QRCodeSVG } from "qrcode.react";

export function PixQrCode({ value, size = 164 }: { value: string; size?: number }) {
  return (
    <div aria-label="QR Code Pix" className="pix-qr-code" data-pix-code={value} role="img">
      <QRCodeSVG
        bgColor="#ffffff"
        fgColor="#10121f"
        includeMargin
        level="M"
        size={size}
        value={value}
      />
    </div>
  );
}
