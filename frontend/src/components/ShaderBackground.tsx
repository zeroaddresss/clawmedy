"use client";

import type React from "react";
import { MeshGradient } from "@paper-design/shaders-react";

interface ShaderBackgroundProps {
  children: React.ReactNode;
}

export default function ShaderBackground({ children }: ShaderBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <MeshGradient
        className="fixed inset-0 h-full w-full"
        colors={["#000000", "#8b5cf6", "#ffffff", "#1e1b4b", "#4c1d95"]}
        speed={0.3}
      />
      <MeshGradient
        className="fixed inset-0 h-full w-full opacity-40"
        colors={["#000000", "#ffffff", "#8b5cf6", "#000000"]}
        speed={0.2}
        grainOverlay={0.3}
      />
      {children}
    </div>
  );
}
