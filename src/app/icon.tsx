import { ImageResponse } from "next/og";

import { iconMarkDataUri } from "@/lib/icon-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <img src={iconMarkDataUri(14)} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
