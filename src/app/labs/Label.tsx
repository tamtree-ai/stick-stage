import React from "react";

export const Label: React.FC<{ children: React.ReactNode; x: number; y: number; size?: number; align?: "left" | "center" }> = ({
  children,
  x,
  y,
  size = 34,
  align = "left",
}) => (
  <div
    style={{
      position: "absolute",
      left: align === "center" ? x - 300 : x,
      top: y,
      width: align === "center" ? 600 : undefined,
      textAlign: align,
      fontFamily: "ui-monospace, Menlo, monospace",
      fontSize: size,
      fontWeight: 700,
      color: "#1b1b1f",
      background: "rgba(255,255,255,0.8)",
      padding: "4px 10px",
      borderRadius: 8,
      whiteSpace: "pre",
    }}
  >
    {children}
  </div>
);
