import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { AppShell } from "./layouts/AppShell";
import { Login } from "./pages/auth/Login";
import { Upload } from "./pages/app/Upload";
import { Recordings } from "./pages/app/Recordings";
import { TranscriptEditor } from "./pages/app/TranscriptEditor";
import { AdminUsers } from "./pages/admin/Users";
import { AdminProviderKeys } from "./pages/admin/ProviderKeys";
import { AdminPlatformSettings } from "./pages/admin/PlatformSettings";
import { UploadIcon, RecordingsIcon, UsersIcon, KeyIcon, SettingsIcon } from "./components/icons";

const userNavItems = [
  { to: "/upload", label: "Upload", icon: <UploadIcon /> },
  { to: "/recordings", label: "Recordings", icon: <RecordingsIcon /> },
];

const adminNavItems = [
  { to: "/admin/users", label: "Users", icon: <UsersIcon /> },
  { to: "/admin/providers", label: "Provider API Keys", icon: <KeyIcon /> },
  { to: "/admin/settings", label: "Platform Settings", icon: <SettingsIcon /> },
];

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/upload" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/upload"
        element={
          <RequireAuth>
            <AppShell navItems={userNavItems}>
              <Upload />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/recordings"
        element={
          <RequireAuth>
            <AppShell navItems={userNavItems}>
              <Recordings />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/recordings/:recordingId"
        element={
          <RequireAuth>
            <AppShell navItems={userNavItems}>
              <TranscriptEditor />
            </AppShell>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AppShell navItems={adminNavItems}>
              <AdminUsers />
            </AppShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/providers"
        element={
          <RequireAdmin>
            <AppShell navItems={adminNavItems}>
              <AdminProviderKeys />
            </AppShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <AppShell navItems={adminNavItems}>
              <AdminPlatformSettings />
            </AppShell>
          </RequireAdmin>
        }
      />

      <Route path="*" element={<Navigate to="/upload" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
