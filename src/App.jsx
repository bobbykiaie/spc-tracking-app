import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Reports from "./components/Reports";
import SPCData from "./components/SPCData";
import BuildPage from "./components/BuildPage";
import EngineerDashboard from "./components/EngineerDashboard";
import Login from "./components/Login";
import ActiveBuild from "./components/ActiveBuild";
import { SampleProvider } from './components/SampleContext'; // Adjust path as needed

function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(""); // Add error state for UI feedback
  console.log("App.js rendered at", new Date().toISOString());

  const refreshUser = async (caller = 'initial') => {
    console.log(`Refreshing user state from ${caller}...`);
    try {
      const response = await axios.get("http://localhost:5000/current_user", { withCredentials: true });
      console.log('User refresh response:', response.data);
      setUser(response.data);
      setError(""); // Clear error on successful refresh
    } catch (error) {
      console.error('Error refreshing user:', error);
      if (error.response && error.response.status === 401) {
        console.warn('User session expired, setting user to null');
        setUser(null);
        setError("Session expired. Please log in again.");
      } else {
        setError("An error occurred. Please try logging in again.");
        setUser(null); // Fallback, but log the error
      }
    }
  };

  useEffect(() => {
    refreshUser('initial');
  }, []);

  return (
    <SampleProvider>
      <Router>
        <div>
          <Navbar user={user} refreshUser={refreshUser} />
          {error && (
            <p className="text-red-500 text-center bg-red-100 p-4 rounded-lg shadow-md">
              {error} <button onClick={() => navigate("/spc-tracking-app/login")} className="text-blue-600 underline ml-2">Log In</button>
            </p>
          )}
          <Routes>
            <Route path="/spc-tracking-app/Home" element={<Home user={user} refreshUser={refreshUser} />} />
            <Route path="/spc-tracking-app/reports" element={<Reports />} />
            <Route path="/spc-tracking-app/spc-data" element={<SPCData />} />
            <Route path="/spc-tracking-app/build/:ys_number" element={<BuildPage />} />
            <Route path="/spc-tracking-app/dashboard" element={<EngineerDashboard />} />
            <Route path="/spc-tracking-app/login" element={<Login refreshUser={refreshUser} />} />
            <Route path="/spc-tracking-app/build/:config_number/:mp_number" element={<BuildPage />} />
            <Route path="/spc-tracking-app/active-build" element={<ActiveBuild user={user} refreshUser={refreshUser} />} />
          </Routes>
        </div>
      </Router>
    </SampleProvider>
  );
}

export default App;