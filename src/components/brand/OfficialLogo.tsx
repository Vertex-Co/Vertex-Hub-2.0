import { useEffect, useRef } from "react";

export function OfficialLogo({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const image = new Image();
    image.src = "/assets/vertex-logo-source.png";
    image.onload = () => {
      const target = canvas.current;
      if (!target) return;
      target.width = image.naturalWidth;
      target.height = image.naturalHeight;
      const context = target.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, target.width, target.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
        if (g > 120 && g > r * 1.35 && g > b * 1.35) pixels.data[i + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
    };
  }, []);
  return <canvas ref={canvas} className={className} aria-label="Vertex" role="img" />;
}
