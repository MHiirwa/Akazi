import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./dashboards/AdminDashboard";
import EmployerDashboard from "./dashboards/EmployerDashboard";
import JobSeekerDashboard from "./dashboards/JobSeekerDashboard";

// Each role dashboard renders its own chrome: admin & employer use a vertical
// sidebar layout; job seeker / freelancer use a horizontal toolbar layout.
export default function Dashboard() {
  const { user } = useAuth();

  if (user.role === "ADMIN") return <AdminDashboard />;
  if (user.role === "EMPLOYER") return <EmployerDashboard />;
  return <JobSeekerDashboard />;
}
