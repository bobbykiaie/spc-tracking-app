import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Home({ user, refreshUser }) {
  const [lotNumber, setLotNumber] = useState("");
  const [mpList, setMpList] = useState([]);
  const [selectedMP, setSelectedMP] = useState(null);
  const [error, setError] = useState("");
  const [activeBuild, setActiveBuild] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://spc-tracking-app-backend.onrender.com";

  useEffect(() => {
    if (user) {
      fetchActiveBuild(user.username);
    } else {
      setActiveBuild(null);
    }
  }, [user]);

  const fetchActiveBuild = async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/active_builds`, { withCredentials: true });
      const userBuild = response.data.find((b) => b.username === username);
      setActiveBuild(userBuild || null);
    } catch (error) {
      setActiveBuild(null);
    }
  };

  const handleSearchLot = async () => {
    if (!lotNumber.trim()) {
      setError("Please enter a lot number.");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/manufacturing_procedures/by-lot/${lotNumber}`);
      if (response.data.length > 0) {
        const uniqueMps = Array.from(
          new Set(response.data.map((mp) => mp.mp_number))
        ).map((mpNumber) => response.data.find((mp) => mp.mp_number === mpNumber));
        setMpList(uniqueMps);
        setSelectedMP(null);
        setError("");
      } else {
        setMpList([]);
        setError("No MPs found for this lot number.");
      }
    } catch (error) {
      setError("Lot number not found.");
    }
  };

  const handleSelectMP = (mp) => {
    setSelectedMP(mp);
  };

  const handleStartBuild = async () => {
    if (!selectedMP) return;

    try {
      await axios.post(
        `${API_BASE_URL}/start_build`,
        {
          username: user.username,
          lot_number: lotNumber,
          mp_number: selectedMP.mp_number,
        },
        { withCredentials: true }
      );

      await fetchActiveBuild(user.username);
      setMpList([]);
      setLotNumber("");
      setSelectedMP(null);
    } catch (error) {
      console.error("❌ Error starting build:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center tracking-tight">Tracker Pro</h1>

      {user ? (
        <>
          <div className="max-w-3xl mx-auto">
            {activeBuild ? (
              <div
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-200"
                onClick={() => navigate("/spc-tracking-app/active-build")}
              >
                <h2 className="text-2xl font-semibold text-blue-700 mb-4">Current Active Build</h2>
                <div className="space-y-3 text-gray-800">
                  <p>
                    <span className="font-medium">Lot Number:</span> {activeBuild.lot_number}
                  </p>
                  <p>
                    <span className="font-medium">Configuration:</span> {activeBuild.config_number}
                  </p>
                  <p>
                    <span className="font-medium">Manufacturing Procedure:</span> {activeBuild.mp_number}
                  </p>
                  <p>
                    <span className="font-medium">Start Time:</span> {new Date(activeBuild.start_time).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome, {user.username}!</h2>
                  <p className="text-gray-600">
                    Enter a <span className="font-bold text-blue-600">"Lot Number"</span> to find associated Manufacturing Procedures.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder='Enter Lot Number (e.g., "LOT001")'
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder-gray-400 transition-all duration-300"
                  />
                  <button
                    onClick={handleSearchLot}
                    className="absolute right-2 top-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md"
                  >
                    Search Lot
                  </button>
                </div>

                {error && (
                  <p className="text-red-500 text-center bg-red-100 p-4 rounded-lg shadow-md">{error}</p>
                )}

                {mpList.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      Manufacturing Procedures for Lot {lotNumber}:
                    </h3>
                    <div className="grid gap-4">
                      {mpList.map((mp) => (
                        <button
                          key={mp.mp_number}
                          onClick={() => handleSelectMP(mp)}
                          className={`w-full p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 ${
                            selectedMP?.mp_number === mp.mp_number
                              ? "bg-blue-100 border-blue-400 ring-2 ring-blue-500 transform scale-105"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-medium text-gray-800">{mp.procedure_name}</span>
                            <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                              MP#: {mp.mp_number}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedMP && (
                      <button
                        onClick={handleStartBuild}
                        className="w-full mt-6 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors duration-300 shadow-md font-semibold text-lg"
                      >
                        Start Build
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-red-500 text-xl font-semibold bg-red-100 p-4 rounded-lg shadow-md">
          Please log in to start a build.
        </p>
      )}
    </div>
  );
}