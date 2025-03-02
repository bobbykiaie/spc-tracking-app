import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { SampleContext } from "./SampleContext";
import { useNavigate } from "react-router-dom"; // Add this import

export default function ActiveBuild({ user, refreshUser }) {
  const { selectedSample, setSelectedSample } = useContext(SampleContext);
  const [activeBuild, setActiveBuild] = useState(null);
  const [lotDetails, setLotDetails] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [inspectionValues, setInspectionValues] = useState({});
  const [passFailValues, setPassFailValues] = useState({});
  const [yieldData, setYieldData] = useState({ yield: 100, totalUnits: 0, passedUnits: 0, rejectedUnits: 0 });
  const navigate = useNavigate(); // Add this for navigation

  useEffect(() => {
    console.log("ActiveBuild mounted or updated at", new Date().toISOString());
    return () => console.log("ActiveBuild unmounted at", new Date().toISOString());
  }, []);

  useEffect(() => {
    if (user) {
      fetchActiveBuild(user.username);
    }
  }, [user]);

  useEffect(() => {
    if (activeBuild) {
      fetchSpecs(activeBuild.config_number, activeBuild.mp_number);
      fetchInspectionLogs();
      fetchYield(); // Fetch yield initially
    }
  }, [activeBuild]);

  const fetchActiveBuild = async (username) => {
    try {
      const response = await axios.get(`http://localhost:5000/active_builds/${username}`);
      setActiveBuild(response.data);
      if (response.data) {
        fetchLotDetails(response.data.lot_number);
        fetchSpecs(response.data.config_number, response.data.mp_number);
        fetchInspectionLogs();
        fetchYield();
      }
    } catch (error) {
      setActiveBuild(null);
      console.error("Error fetching active build:", error);
    }
  };

  const fetchLotDetails = async (lotNumber) => {
    try {
      const response = await axios.get(`http://localhost:5000/lots/${lotNumber}`);
      setLotDetails(response.data);
    } catch (error) {
      console.error("Error fetching lot details:", error);
    }
  };

  const fetchSpecs = async (configNumber, mpNumber) => {
    try {
      const response = await axios.get(`http://localhost:5000/specs/by-config-mp/${configNumber}/${mpNumber}`);
      setSpecs(response.data);
    } catch (error) {
      console.error("Error fetching specs:", error);
    }
  };

  const fetchInspectionLogs = async () => {
    if (activeBuild) {
      try {
        const response = await axios.get(
          `http://localhost:5000/inspection_logs/${activeBuild.lot_number}/${activeBuild.mp_number}`
        );
        setInspections(response.data || []);
      } catch (error) {
        console.error("Error fetching inspection logs:", error);
        setInspections([]);
      }
    }
  };

  const fetchYield = async () => {
    if (activeBuild) {
      try {
        const response = await axios.get(
          `http://localhost:5000/yield/${activeBuild.lot_number}/${activeBuild.mp_number}`
        );
        setYieldData(response.data);
      } catch (error) {
        console.error("Error fetching yield:", error);
      }
    }
  };

  const handleLogInspection = async (spec, event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("Log Inspection clicked at", new Date().toISOString());

    const inspectionType = spec.type;
    const inspectionValue = inspectionType === "Variable" ? parseFloat(inspectionValues[spec.spec_name]) : null;
    const passFail = inspectionType === "Attribute" ? passFailValues[spec.spec_name] || "Pass" : null;

    try {
      console.log("Sending POST to /log_inspection...");
      const response = await axios.post(
        "http://localhost:5000/log_inspection",
        {
          username: user.username,
          lot_number: activeBuild.lot_number,
          config_number: activeBuild.config_number,
          mp_number: activeBuild.mp_number,
          spec_name: spec.spec_name,
          inspection_type: inspectionType,
          unit_number: selectedSample,
          inspection_value: inspectionType === "Attribute" ? passFail : inspectionValue,
          pass_fail: passFail,
        },
        { withCredentials: true }
      );
      console.log("POST response:", response.data);

      setInspections((prevInspections) => {
        const updatedInspections = prevInspections.filter(
          (ins) => !(ins.unit_number === selectedSample && ins.spec_name === spec.spec_name)
        );
        return [
          ...updatedInspections,
          {
            unit_number: selectedSample,
            spec_name: spec.spec_name,
            pass_fail: response.data.pass_fail, // Use server-calculated pass_fail
          },
        ];
      });

      // Refresh yield and inspection logs after logging
      await fetchYield();
      await fetchInspectionLogs();
    } catch (error) {
      console.error("❌ Error logging inspection:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
    }
  };

  const handleEndBuild = async () => {
    try {
      await axios.post(
        "http://localhost:5000/end_build",
        { username: user.username },
        { withCredentials: true }
      );
      setActiveBuild(null);
      navigate("/spc-tracking-app/Home");
    } catch (error) {
      console.error("❌ Error ending build:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Active Build</h1>
      {activeBuild ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side: Sample Table */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Current Build</h2>
            <div className="space-y-2 mb-4">
              <p><strong className="text-gray-600">Lot Number:</strong> {activeBuild.lot_number}</p>
              <p><strong className="text-gray-600">Configuration:</strong> {activeBuild.config_number}</p>
              <p><strong className="text-gray-600">Manufacturing Procedure:</strong> {activeBuild.mp_number}</p>
              {lotDetails && <p><strong className="text-gray-600">Quantity:</strong> {lotDetails.quantity} units</p>}
            </div>

            {/* Yield Display */}
            <div className="mb-6 p-4 bg-green-100 rounded-lg shadow-inner flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-green-800">Yield: {yieldData.yield}%</p>
                <p className="text-sm text-gray-600">
                  Passed: {yieldData.passedUnits} / {yieldData.totalUnits} units
                </p>
                <p className="text-sm text-red-600">Rejected: {yieldData.rejectedUnits} units</p>
              </div>
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-4 py-2 text-left">Sample</th>
                    {specs.map((spec) => (
                      <th key={spec.spec_name} className="border border-gray-300 px-4 py-2 text-left">
                        {spec.spec_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(lotDetails?.quantity || 10).keys()].map((i) => {
                    const unitNumber = i + 1;
                    return (
                      <tr
                        key={unitNumber}
                        className={`cursor-pointer ${selectedSample === unitNumber ? "bg-blue-100" : "hover:bg-gray-100"}`}
                        onClick={() => setSelectedSample(unitNumber)}
                      >
                        <td className="border border-gray-300 px-4 py-2">{unitNumber}</td>
                        {specs.map((spec) => {
                          const inspection = inspections.find(
                            (ins) => ins.unit_number === unitNumber && ins.spec_name === spec.spec_name
                          );
                          return (
                            <td key={spec.spec_name} className="border border-gray-300 px-4 py-2 text-center">
                              {inspection ? (inspection.pass_fail === "Pass" ? "✅" : "❌") : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button
                onClick={handleEndBuild}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg shadow-md"
              >
                End Build
              </button>
            </div>
          </div>

          {/* Right Side: Inspections */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Inspections for Sample {selectedSample}</h2>
            {specs.map((spec) => (
              <div key={spec.spec_name} className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  {spec.spec_name} ({spec.type})
                </label>
                {spec.type === "Variable" ? (
                  <input
                    type="number"
                    placeholder="Enter Inspection Value"
                    value={inspectionValues[spec.spec_name] || ""}
                    onChange={(e) => setInspectionValues({ ...inspectionValues, [spec.spec_name]: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <select
                    value={passFailValues[spec.spec_name] || "Pass"}
                    onChange={(e) => setPassFailValues({ ...passFailValues, [spec.spec_name]: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label={`Select pass or fail for ${spec.spec_name}`}
                  >
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLogInspection(spec, e);
                  }}
                  className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-300"
                >
                  Log Inspection
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">No MPs have started yet.</p>
      )}
    </div>
  );
}