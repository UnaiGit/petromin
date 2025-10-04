import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  value?: string | null;
  onChange: (nextValue: string | null) => void;
  height?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export function SignaturePad({ value, onChange, height = 180, disabled = false, label, helperText }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(dpr, dpr);
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      if (value) {
        const image = new Image();
        image.onload = () => {
          context.drawImage(image, 0, 0, width, height);
          setHasSignature(true);
        };
        image.src = value;
      } else {
        setHasSignature(false);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [height, value]);

  useEffect(() => {
    if (value) {
      setHasSignature(true);
    }
  }, [value]);

  const toCanvasPoint = (event: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL("image/png");
    setHasSignature(true);
    onChange(data);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = toCanvasPoint(event.nativeEvent);
    context.strokeStyle = "#111827";
    context.lineWidth = 2.4;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = toCanvasPoint(event.nativeEvent);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
    canvas.releasePointerCapture(event.pointerId);
    exportImage();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height: canvasHeight } = canvas.getBoundingClientRect();
    context.clearRect(0, 0, width, canvasHeight);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, canvasHeight);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="signature-pad">
      {label ? <label className="signature-pad__label">{label}</label> : null}
      <div className={`signature-pad__canvas${disabled ? " is-disabled" : ""}${hasSignature ? " has-signature" : ""}`}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Signature input"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          height={height}
        />
        {!hasSignature ? <span className="signature-pad__placeholder">Sign here</span> : null}
      </div>
      <div className="signature-pad__actions">
        <button type="button" className="signature-pad__clear" onClick={handleClear} disabled={disabled || !hasSignature}>
          Clear signature
        </button>
      </div>
      {helperText ? <p className="signature-pad__helper">{helperText}</p> : null}
    </div>
  );
}
