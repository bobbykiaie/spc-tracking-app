import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Reports({ user }) {
  // **Access Control**: Restrict to engineers only
  if (!user || user.role !== 'engineer') {
    return (
      <div className="p-4 text-red-500">
        You do not have permission to view this page.
      </div>
    );
  }

  // **State Variables**
  const [configurations, setConfigurations] = useState([]); // List of products/configurations
  const [selectedConfig, setSelectedConfig] = useState(null); // Selected product
  const [inspectionLogs, setInspectionLogs] = useState([]); // Inspection data for selected product
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [error, setError] = useState(null); // Error state for fetch failures

  // **API Base URL** (Updated to match new backend)
  const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://spc-tracking-app-backend.onrender.com";
  // **Fetch Configurations**
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/configurations`, { withCredentials: true });
        console.log('Raw configurations response:', response.data);

        // Ensure configurations have necessary fields
        const configsWithProducts = response.data.map((config) => {
          const mvdNumber = config.mvd_number || '';
          const productName = config.product_name || 'Unknown Product';
          if (!mvdNumber) {
            console.warn(`Configuration ${config.config_number} has no mvd_number, using default`);
          }
          return {
            ...config,
            product_name: productName,
            mvd_number: mvdNumber,
          };
        });

        setConfigurations(configsWithProducts);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch configurations: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  // **Fetch Inspection Logs** (Updated to use new endpoint)
  useEffect(() => {
    if (selectedConfig) {
      const fetchInspectionLogs = async () => {
        try {
          console.log(`Fetching inspection logs for config_number: ${selectedConfig.config_number}`);
          console.log(`Full API URL: ${API_BASE_URL}/inspection-logs/${encodeURIComponent(selectedConfig.config_number)}`);
          
          const response = await axios.get(
            `${API_BASE_URL}/inspection-logs/${encodeURIComponent(selectedConfig.config_number)}`,
            {
              withCredentials: true,
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          console.log('Inspection logs response:', response.data);
          
          // The new endpoint returns { config_number, inspection_logs }
          setInspectionLogs(response.data.inspection_logs || []);
        } catch (err) {
          console.error('Error fetching inspection logs:', err);
          console.error('Error response:', err.response?.data);
          setError('Failed to fetch inspection logs: ' + (err.response?.data?.error || err.message));
          setInspectionLogs([]);
        }
      };
      fetchInspectionLogs();
    } else {
      setInspectionLogs([]);
    }
  }, [selectedConfig]);

  // **Download Excel File** (Adjusted for new data structure)
  const downloadExcel = () => {
    if (!selectedConfig) {
      alert('Please select a product first.');
      return;
    }
    if (inspectionLogs.length === 0) {
      alert('No inspection logs available for this product.');
      return;
    }

    const data = inspectionLogs.map((log) => ({
      'Product Name': selectedConfig.product_name || 'Unknown',
      'MVD#': selectedConfig.mvd_number || 'Unknown',
      'MVD Config': selectedConfig.config_number || 'Unknown',
      'Inspection Type': log.inspection_type || 'N/A',
      'Spec Name': log.spec_name || 'N/A',
      'Unit Number': log.unit_number || 'N/A',
      'Inspection Value': log.inspection_value !== null && log.inspection_value !== undefined ? log.inspection_value : 'N/A',
      'Pass/Fail': log.pass_fail || 'N/A',
      'Timestamp': log.timestamp || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspection Logs');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${selectedConfig.config_number}_inspection_logs.xlsx`);
  };

  // **Render UI**
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Reports</h1>
      {loading ? (
        <p>Loading configurations...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div>
          <label htmlFor="config-select" className="block text-lg font-medium mb-2 text-gray-700">
            Select a Product:
          </label>
          <select
            id="config-select"
            className="p-3 border border-gray-300 rounded-lg w-full mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setSelectedConfig(configurations.find((config) => config.config_number === e.target.value))}
            value={selectedConfig?.config_number || ''}
          >
            <option value="">-- Select a Product --</option>
            {configurations.map((config) => (
              <option key={config.config_number} value={config.config_number}>
                {config.config_number} - {config.product_name}
              </option>
            ))}
          </select>

          {selectedConfig && (
            <div>
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md mb-4 hover:bg-blue-700 transition-colors"
                disabled={inspectionLogs.length === 0}
              >
                Download Excel
              </button>
              {inspectionLogs.length === 0 && (
                <p className="text-gray-500">No inspection logs available for this product.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}