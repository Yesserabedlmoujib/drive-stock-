import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileOutput,
  History,
  LayoutDashboard,
  Menu,
  Package,
  Users,
  User,
  Warehouse,
  Truck,
  RotateCcw,
  ClipboardMinus,
  FileText,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },

  { to: "/profile", icon: User, label: "Profile" },

  { to: "/customer", icon: Users, label: "Clients" },

  { to: "/products", icon: Package, label: "Produits" },

  // Stock خروج
  {
    to: "/bon-de-sortie",
    icon: ClipboardMinus,
    label: "Bon de Sortie",
  },

  // Livraison
  {
    to: "/bon-de-livraison",
    icon: Truck,
    label: "Bon de livraison",
  },

  // Retour
  {
    to: "/bon-de-retour",
    icon: RotateCcw,
    label: "Bon de retour",
  },

  // Historique sortie
  {
    to: "/history",
    icon: History,
    label: "Historique sortie",
  },

  // Historique livraison
  {
    to: "/historyLivraison",
    icon: FileText,
    label: "Historique Livraison",
  },

  // Historique retour
  {
    to: "/historyRetour",
    icon: RotateCcw,
    label: "Historique Retour",
  },
];

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 bg-sidebar border-b border-sidebar-border md:hidden">
        <div className="flex items-center gap-3">
          <Warehouse className="w-7 h-7 text-sidebar-primary" />
          <span className="text-lg font-semibold text-sidebar-foreground">
            Drive Stock
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-sidebar-border">
          <Warehouse className="w-8 h-8 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground">
            Drive Stock
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
            <span className="text-xs text-sidebar-muted">
              Mode hors ligne actif
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
