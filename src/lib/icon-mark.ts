/**
 * The "moeda & broto" (coin & sprout) brand mark, as a raw SVG string.
 * Kept as a string (not JSX) because it's embedded as a data URI `<img>`
 * inside `ImageResponse` — satori/resvg render `<img>` sources, not raw
 * `<svg>`/`<circle>` JSX children.
 */
export function iconMarkSvg(radius: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<rect width="64" height="64" rx="${radius}" fill="#10162a"/>
<circle cx="32" cy="40" r="16" fill="#e8b75c"/>
<circle cx="32" cy="40" r="12" fill="none" stroke="#3a2f14" stroke-width="1.5" opacity="0.35"/>
<line x1="23" y1="40" x2="41" y2="40" stroke="#3a2f14" stroke-width="2" opacity="0.5"/>
<line x1="32" y1="24" x2="32" y2="10" stroke="#34c795" stroke-width="2.5" stroke-linecap="round"/>
<g transform="rotate(-28 25 14)">
<ellipse cx="25" cy="14" rx="7.5" ry="3.5" fill="#34c795"/>
<line x1="17.5" y1="14" x2="32.5" y2="14" stroke="#16332a" stroke-width="1" opacity="0.4"/>
</g>
<g transform="rotate(28 39 14)">
<ellipse cx="39" cy="14" rx="7.5" ry="3.5" fill="#34c795"/>
<line x1="31.5" y1="14" x2="46.5" y2="14" stroke="#16332a" stroke-width="1" opacity="0.4"/>
</g>
</svg>`;
}

export function iconMarkDataUri(radius: number): string {
  const svg = iconMarkSvg(radius);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
