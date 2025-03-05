import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar'; // Adjust path as needed
import SPC from './components/SPC'; // Adjust path as needed
import ActiveBuildsList from './components/ActiveBuildsList'; // Adjust path as needed
import Home from './components/Home'; // Adjust path as needed
import ActiveBuild from './components/ActiveBuild'; // Adjust path as needed
import SPCData from './components/SPCData'; // Adjust path as needed
import Login from './components/Login'; // Adjust path as needed
import Reports from './components/Reports'; // Adjust path as needed
import { SampleProvider } from './components/SampleContext'; // Adjust path as needed

function App() {
    const [user, setUser] = useState(null);

    const refreshUser = async () => {
        try {
            const response = await axios.get('http://localhost:5000/current_user', { withCredentials: true });
            setUser(response.data);
        } catch (error) {
            console.error('Error refreshing user:', error);
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <SampleProvider> {/* Wrap the entire app with SampleProvider */}
            <Router>
                <div>
                    <Navbar user={user} refreshUser={refreshUser} />
                    <Routes>
                        <Route
                            path="/spc-tracking-app/Home"
                            element={<Home user={user} refreshUser={refreshUser} />}
                        />
                        <Route
                            path="/spc-tracking-app/active-builds"
                            element={<ActiveBuildsList user={user} />}
                        />
                        <Route
                            path="/spc-tracking-app/spc"
                            element={<SPC user={user} />}
                        />
                        <Route
                            path="/spc-tracking-app/spc-data"
                            element={<SPCData user={user} refreshUser={refreshUser} />}
                        />
                        <Route
                            path="/spc-tracking-app/active-build"
                            element={<ActiveBuild user={user} refreshUser={refreshUser} />}
                        />
                        <Route
                            path="/spc-tracking-app/login"
                            element={<Login refreshUser={refreshUser} />}
                        />
                        <Route
                            path="/spc-tracking-app/reports"
                            element={<Reports user={user} />}
                        />
                    </Routes>
                </div>
            </Router>
        </SampleProvider>
    );
}

export default App;