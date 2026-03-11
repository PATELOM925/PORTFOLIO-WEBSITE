import { ReactNode } from "react";
import { FloatingAssistant } from "@/components/FloatingAssistant";
import { PrimaryNav } from "@/components/PrimaryNav";
import { navigation, siteConfig, socialLinks } from "@/config/site";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <PrimaryNav items={navigation} />
        </div>
      </header>

      <main>{children}</main>
      <FloatingAssistant />

      <footer className="site-footer">
        <div className="container footer-grid">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <div className="social-row" aria-label="Social links">
            {socialLinks.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
