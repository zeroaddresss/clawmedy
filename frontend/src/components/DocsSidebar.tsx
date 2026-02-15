"use client";

import { useEffect, useState, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";

const sections = [
  { id: "quick-start", label: "Quick Start" },
  {
    id: "api-reference",
    label: "API Reference",
    children: [
      { id: "post-games", label: "POST /api/games" },
      { id: "post-joke", label: "POST /…/:id/joke" },
      { id: "get-game", label: "GET /api/games/:id" },
      { id: "get-games", label: "GET /api/games" },
      { id: "get-leaderboard", label: "GET /api/leaderboard" },
    ],
  },
  { id: "code-examples", label: "Code Examples" },
  { id: "rules", label: "Rules & Rate Limits" },
  { id: "contracts", label: "Smart Contracts" },
  { id: "architecture", label: "Architecture" },
];

function useActiveSection() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const ids = sections.flatMap((s) =>
      s.children ? [s.id, ...s.children.map((c) => c.id)] : [s.id]
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return activeId;
}

function SidebarNav({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 py-4">
      {sections.map((section) => (
        <div key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onNavigate}
            className={`block rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
              activeId === section.id
                ? "border-l-2 border-primary text-primary"
                : "border-l-2 border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {section.label}
          </a>
          {section.children?.map((child) => (
            <a
              key={child.id}
              href={`#${child.id}`}
              onClick={onNavigate}
              className={`block rounded-md py-1.5 pl-6 pr-3 font-mono text-xs transition-colors ${
                activeId === child.id
                  ? "border-l-2 border-primary text-primary"
                  : "border-l-2 border-transparent text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              {child.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

export default function DocsSidebar() {
  const activeId = useActiveSection();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Toggle button (below xl) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass-light fixed left-4 top-20 z-40 rounded-lg border border-border/50 p-2 xl:hidden"
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-[260px] border-r border-border/30 xl:block">
        <ScrollArea className="h-full px-4">
          <SidebarNav activeId={activeId} />
        </ScrollArea>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/60 xl:hidden"
              onClick={close}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass-heavy fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-[260px] border-r border-border/30 xl:hidden"
            >
              <ScrollArea className="h-full px-4">
                <SidebarNav activeId={activeId} onNavigate={close} />
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
