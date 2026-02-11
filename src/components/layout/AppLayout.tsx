import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-64 pt-16 md:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
