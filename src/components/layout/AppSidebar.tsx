import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClipboardMinus,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Truck,
  User,
  Users,
  Warehouse,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LanguageSwitcher from "../LanguageSwitcher";

import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/db/services/auth";

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const { t } = useTranslation();
  const navItems = useMemo(
    () => [
      { to: "/", icon: LayoutDashboard, label: t("dashboard") },
      { to: "/profile", icon: User, label: t("profile") },
      { to: "/customer", icon: Users, label: t("customers") },
      { to: "/products", icon: Package, label: t("products") },
      { to: "/bon-de-sortie", icon: ClipboardMinus, label: t("bon_sortie") },
      { to: "/bon-de-livraison", icon: Truck, label: t("bon_livraison") },
      { to: "/bon-de-retour", icon: RotateCcw, label: t("bon_retour") },
      { to: "/history", icon: History, label: t("history_sortie") },
      {
        to: "/historyLivraison",
        icon: FileText,
        label: t("history_livraison"),
      },
      { to: "/historyRetour", icon: RotateCcw, label: t("history_retour") },
    ],
    [t],
  );

  async function handleLogout() {
    const { error } = await signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t("logout_success"));
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-sidebar border-b border-sidebar-border md:hidden">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-sidebar-primary" />
          <span className="text-base font-semibold text-sidebar-foreground">
            Drive Stock
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
          "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo - Compact */}
        <div className="flex items-center gap-2 h-14 px-4 border-b border-sidebar-border flex-shrink-0">
          <Warehouse className="w-6 h-6 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-foreground">
            Drive Stock
          </span>
        </div>

        {/* Navigation - Compact items */}
        <div className="flex-1 overflow-y-auto">
          <nav className="flex flex-col gap-0.5 ">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeSidebar}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3 space-y-3">
          {/* Language Switcher */}
          <div className="flex justify-center w-full px-2 py-0.5">
            <LanguageSwitcher />
          </div>

          {/* User Panel */}
          {/* <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3"> */}
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm">
              {userInitial}
            </div>

            {/* User Info */}
            <div className="min-w-0 flex-1">
              {/* <p className="text-xs font-medium text-sidebar-foreground  break-all leading-tight">
                  {user?.email || t("user")}
                </p> */}
              <p
                className="text-xs font-medium text-sidebar-foreground break-all"
                title={user?.email}
              >
                {user?.email}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
                <span className="text-xs text-sidebar-muted">
                  {t("offline_mode_active")}
                </span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center h-8 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
        {/* </div> */}
      </aside>
    </>
  );
}