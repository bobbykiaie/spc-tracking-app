import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Reports from "./components/Reports";
import SPCData from "./components/SPCData";
import BuildPage from "./components/BuildPage";
import EngineerDashboard from "./components/EngineerDashboard";
import Login from "./components/Login";

function App() {
  const [user, setUser] = useState(null);

  // ✅ Fetch logged-in user
  const refreshUser = async () => {
    try {
      const response = await axios.get("http://localhost:5000/current_user", { withCredentials: true });
      setUser(response.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <Router>
      <div>
        <Navbar user={user} refreshUser={refreshUser} />
        <Routes>
          <Route path="/spc-tracking-app/Home" element={<Home user={user} refreshUser={refreshUser} />} />
          <Route path="/spc-tracking-app/reports" element={<Reports />} />
          <Route path="/spc-tracking-app/spc-data" element={<SPCData />} />
          <Route path="/spc-tracking-app/build/:ys_number" element={<BuildPage />} />
          <Route path="/spc-tracking-app/dashboard" element={<EngineerDashboard />} />
          <Route path="/spc-tracking-app/login" element={<Login refreshUser={refreshUser} />} />
          <Route path="/spc-tracking-app/build/:config_number/:mp_number" element={<BuildPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
