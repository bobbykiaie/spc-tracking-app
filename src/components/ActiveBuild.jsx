import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ActiveBuild({ user, refreshUser }) {
  const [activeBuild, setActiveBuild] = useState(null);

  useEffect(() => {
    if (user) {
      fetchActiveBuild(user.username);
    }
  }, [user]);

  const fetchActiveBuild = async (username) => {
    try {
      const response = await axios.get(`http://localhost:5000/active_builds/${username}`);
      setActiveBuild(response.data);
    } catch (error) {
      setActiveBuild(null);
    }
  };

  const handleEndBuild = async () => {
    try {
        console.log("Ending build for user:", user.username);

        const response = await axios.post(
            "http://localhost:5000/end_build",
            { username: user.username }, // ✅ Ensure we're sending `username`
            { withCredentials: true }
        );

        console.log("✅ End build response:", response.data.message);
        setActiveBuild(null); // ✅ Remove active build from state
        refreshUser(); // ✅ Ensure Home and Navbar update immediately
    } catch (error) {
        console.error("❌ Error ending build:", error.response?.data || error.message);
    }
};




  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Active Build</h1>

      {activeBuild ? (
        <div className="bg-gray-100 p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold">Current Active Build</h2>
          <p><strong>Lot Number:</strong> {activeBuild.lot_number}</p>
          <p><strong>Configuration:</strong> {activeBuild.config_number}</p>
          <p><strong>Manufacturing Procedure:</strong> {activeBuild.mp_number}</p>
          <p><strong>Start Time:</strong> {activeBuild.start_time}</p>
          <button
            onClick={handleEndBuild}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow-md"
          >
            End Build
          </button>
        </div>
      ) : (
        <p>No MPs have started yet.</p>
      )}
    </div>
  );
}
