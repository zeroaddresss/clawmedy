import Image from "next/image";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="glass-heavy border-t border-border/50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground/60">
          Clawmedy &mdash; Built on
          <Image src="/monad-logo.svg" alt="Monad" width={14} height={14} className="inline-block" />
          Monad
        </span>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/zeroaddresss/clawmedy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 transition-colors hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://x.com/clawmedydotfun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 transition-colors hover:text-foreground"
            aria-label="X"
          >
            <Twitter className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
