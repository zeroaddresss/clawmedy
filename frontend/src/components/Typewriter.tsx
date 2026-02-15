"use client";

import { useEffect, useState } from "react";

export default function Typewriter({
  text,
  speed = 30,
}: {
  text: string;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="animate-pulse text-primary">|</span>
      )}
    </span>
  );
}
