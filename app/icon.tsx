import { ImageResponse } from "next/og";
import * as React from "react";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0610",
          borderRadius: "8px",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 22.5c0-3 2.5-5.5 5.5-5.5H39c1.5 0 3 .6 4.1 1.7l6.2 6.2c1.1 1.1 1.7 2.6 1.7 4.1V39c0 3-2.5 5.5-5.5 5.5H21.5c-3 0-5.5-2.5-5.5-5.5V22.5Z"
            stroke="#ff1e96"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="31" cy="31" r="7.5" stroke="#ff1e96" strokeWidth="3" />
          <circle cx="31" cy="31" r="3" fill="rgba(255,255,255,0.85)" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}


