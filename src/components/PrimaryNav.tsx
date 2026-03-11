"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  sectionId?: string;
  routePrefix?: string;
}

interface PrimaryNavProps {
  items: readonly NavItem[];
}

export function PrimaryNav({ items }: PrimaryNavProps) {
  const pathname = usePathname();
  const [active, setActive] = useState<string>(() => {
    if (pathname.startsWith("/projects")) return "/#projects";
    if (pathname.startsWith("/blog")) return "/#blog";
    return "/#about";
  });

  const homeItems = useMemo(() => items.filter((item) => item.sectionId), [items]);

  useEffect(() => {
    if (pathname !== "/") {
      const routeItem = items.find((item) => item.routePrefix && pathname.startsWith(item.routePrefix));
      setActive(routeItem?.href || "");
      return;
    }

    const sections = homeItems
      .map((item) => document.getElementById(item.sectionId || ""))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) {
      setActive("/#about");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible?.target.id) return;
        const matched = homeItems.find((item) => item.sectionId === visible.target.id);
        if (matched) setActive(matched.href);
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5, 0.7]
      }
    );

    sections.forEach((section) => observer.observe(section));

    const onHashChange = () => {
      if (window.location.hash) {
        setActive(`/${window.location.hash}`);
      }
    };

    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [homeItems, items, pathname]);

  return (
    <nav className="main-nav" aria-label="Primary navigation">
      {items.map((item) => {
        const isActive = active === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? " active" : ""}`}
            onClick={() => setActive(item.href)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
