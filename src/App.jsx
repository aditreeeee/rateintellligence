import { Routes, Route } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { ToastProvider } from "./context/ToastContext";
import AppShell from "./components/shell/AppShell";

import Dashboard from "./pages/Dashboard";
import PropertyList from "./pages/properties/PropertyList";
import PropertyDetail from "./pages/properties/PropertyDetail";
import RoomsPage from "./pages/rooms/RoomsPage";
import RoomDetailPage from "./pages/rooms/RoomDetailPage";
import RatePlansPage from "./pages/rateplans/RatePlansPage";
import RatePlanDetailPage from "./pages/rateplans/RatePlanDetailPage";
import CalendarPage from "./pages/calendar/CalendarPage";
import ComparisonPage from "./pages/comparison/ComparisonPage";
import SettingsPage from "./pages/settings/SettingsPage";

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<PropertyList />} />
            <Route path="/properties/new" element={<PropertyDetail mode="create" />} />
            <Route path="/properties/:id" element={<PropertyDetail mode="view" />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomDetailPage />} />
            <Route path="/rate-plans" element={<RatePlansPage />} />
            <Route path="/rate-plans/:id" element={<RatePlanDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </DataProvider>
  );
}
