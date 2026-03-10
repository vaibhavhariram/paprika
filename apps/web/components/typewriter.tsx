"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
}

export function Typewriter({ text, speed = 45, className }: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [done, setDone] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setDisplayText(text);
      setDone(true);
      return;
    }

    let i = 0;
    setDisplayText("");
    setDone(false);

    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, prefersReduced]);

  return (
    <span className={className}>
      {displayText}
      {!done && <span className="typewriter-cursor" />}
    </span>
  );
}
