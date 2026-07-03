import { ImageResponse } from "next/og";

// Marca do ConfecControl desenhada em SVG (sem depender de fontes):
// quadrado escuro com um "C" teal e uma conta creme (alusao a linha/agulha).
function iconSvg(rounded: boolean): string {
  const radius = rounded ? 112 : 0;
  return `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="${radius}" fill="#111a16"/>
  <path d="M348 176 A104 104 0 1 0 348 336" fill="none" stroke="#087f7d" stroke-width="40" stroke-linecap="round"/>
  <circle cx="366" cy="256" r="26" fill="#f4f6f5"/>
</svg>`;
}

export function renderIcon(size: number, rounded: boolean): ImageResponse {
  const dataUri =
    "data:image/svg+xml;base64," +
    Buffer.from(iconSvg(rounded)).toString("base64");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={size} height={size} src={dataUri} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
