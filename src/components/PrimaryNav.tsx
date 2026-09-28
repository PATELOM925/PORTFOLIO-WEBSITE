"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface NavItem {
  label: string;
  href: string;
  sectionId?: string;
  routePrefix?: string;
  secondary?: boolean;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const homeItems = useMemo(() => items.filter((item) => item.sectionId), [items]);
  const secondaryItems = useMemo(() => items.filter((item) => item.secondary), [items]);
  const secondaryActive = secondaryItems.some((item) => item.href === active);

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

  // Close menus on Escape, outside click, and when the viewport grows past the phone layout.
  useEffect(() => {
    if (!menuOpen && !moreOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMoreOpen(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (moreOpen && moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const onResize = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    document.body.classList.toggle("nav-locked", menuOpen);
    return () => document.body.classList.remove("nav-locked");
  }, [menuOpen]);

  function select(href: string) {
    setActive(href);
    setMenuOpen(false);
    setMoreOpen(false);
  }

  function renderLink(item: NavItem, className = "nav-link") {
    const isActive = active === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${className}${isActive ? " active" : ""}`}
        aria-current={isActive ? "location" : undefined}
        onClick={() => select(item.href)}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <>
      <nav className="main-nav" aria-label="Primary navigation">
        {items.map((item) => renderLink(item, item.secondary ? "nav-link nav-link-secondary" : "nav-link"))}

        <div className="nav-more" ref={moreRef}>
          <button
            type="button"
            className={`nav-link nav-more-toggle${secondaryActive ? " active" : ""}`}
            aria-expanded={moreOpen}
            aria-controls="nav-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
          >
            More
            <span className="nav-caret" aria-hidden="true" />
          </button>
          {moreOpen ? (
            <div id="nav-more-menu" className="nav-more-menu">
              {secondaryItems.map((item) => renderLink(item, "nav-menu-link"))}
            </div>
          ) : null}
        </div>
      </nav>

      <button
        type="button"
        className="nav-menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="nav-sheet"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={`nav-burger${menuOpen ? " is-open" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>{menuOpen ? "Close" : "Menu"}</span>
      </button>

      {menuOpen ? (
        <>
          <div className="nav-sheet-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <nav id="nav-sheet" className="nav-sheet" aria-label="Site menu">
            {items.map((item) => renderLink(item, "nav-menu-link"))}
            <a href="/go/resume" className="btn btn-primary nav-sheet-cta" target="_blank" rel="noreferrer">
              Download Resume
            </a>
          </nav>
        </>
      ) : null}
    </>
  );
}
