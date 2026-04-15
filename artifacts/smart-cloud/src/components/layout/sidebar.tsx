import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  HardDrive, 
  FolderOpen, 
  BrainCircuit, 
  Link2, 
  Settings,
  BookOpen,
  Globe,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation, LANGUAGES, type Lang } from "@/lib/i18n";

export function Sidebar() {
  const [location] = useLocation();
  const { t, lang, setLang } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigation = [
    { name: t.nav.dashboard,   href: "/",            icon: LayoutDashboard },
    { name: t.nav.storage,     href: "/storage",     icon: HardDrive },
    { name: t.nav.files,       href: "/files",       icon: FolderOpen },
    { name: t.nav.ai,          href: "/ai",          icon: BrainCircuit },
    { name: t.nav.connections, href: "/connections", icon: Link2 },
    { name: t.nav.settings,    href: "/settings",    icon: Settings },
  ];

  const bottomNav = [
    { name: t.nav.setup, href: "/setup", icon: BookOpen },
  ];

  const currentLang = LANGUAGES.find(l => l.code === lang)!;

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <BrainCircuit className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight text-foreground">
          Smart Cloud
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        {bottomNav.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                )}
              />
              {item.name}
            </Link>
          );
        })}

        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setLangOpen(o => !o)}
            className="w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <Globe className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="flex-1 text-left">{currentLang.flag} {currentLang.label}</span>
          </button>
          {langOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span>{l.flag}</span>
                  <span className="flex-1 text-left">{l.label}</span>
                  {lang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-3 py-3 border-t border-border mt-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">SC</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{t.nav.admin}</span>
              <span className="text-xs text-muted-foreground">{t.nav.selfHosted}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
