import "./App.css";
import { useAppStore } from "./state/useAppStore";
import { HomeScreen } from "./screens/HomeScreen";
import { CorporateExperience } from "./screens/CorporateExperience";
import { AdminDashboard } from "./screens/AdminDashboard";

function App() {
  const corporateMode = useAppStore((state) => state.corporateMode);
  if (corporateMode === "admin") {
    return <AdminDashboard />;
  }
  if (corporateMode === "corporate") {
    return <CorporateExperience />;
  }
  return <HomeScreen />;
}

export default App;
