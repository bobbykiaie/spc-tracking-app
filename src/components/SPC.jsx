import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Bar } from 'react-chartjs-2'; // For histogram
import Plotly from 'plotly.js-dist'; // Ensure this import works for Q-Q plots
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, BarElement, Tooltip, Legend);

export default function SPC({ user }) {
  // Restrict access to engineers only
  if (!user || user.role !== 'engineer') {
    return <div className="p-4 text-red-500">You do not have permission to view this page.</div>;
  }

  // State variables
  const [configNumbers, setConfigNumbers] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [mps, setMps] = useState([]);
  const [selectedMp, setSelectedMp] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [inspectionData, setInspectionData] = useState([]);
  const [lsl, setLsl] = useState(null);
  const [usl, setUsl] = useState(null);
  const [mean, setMean] = useState(null);
  const [ucl, setUcl] = useState(null);
  const [lcl, setLcl] = useState(null);
  const [cpk, setCpk] = useState(null);
  const [stdDev, setStdDev] = useState(null); // Standard deviation for control chart
  const [showStdDev, setShowStdDev] = useState(true); // Toggle for standard deviation lines
  const [showMovingRange, setShowMovingRange] = useState(false); // Toggle for moving range chart
  const [normalityData, setNormalityData] = useState(null);
  const [testType, setTestType] = useState('shapiro_wilk'); // Default to Shapiro-Wilk
  const [normalityLoading, setNormalityLoading] = useState(false);
  const [normalityError, setNormalityError] = useState(null);
  const [showNormality, setShowNormality] = useState(false); // Toggle for normality section visibility
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configure axios base URL for backend
  const API_BASE_URL = 'http://localhost:5000';

  // Configure Axios to include credentials (cookies) for all requests
  axios.defaults.withCredentials = true; // Ensure cookies (e.g., auth_token) are sent with every request

  // Fetch all configuration numbers on component mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/configurations`);
        setConfigNumbers(response.data.map(config => config.config_number));
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch configurations: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  // Fetch MPs when a configuration is selected
  useEffect(() => {
    if (selectedConfig) {
      const fetchMps = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/manufacturing_procedures/by-config/${selectedConfig}`);
          const uniqueMps = [...new Set(response.data.map(mp => mp.mp_number))];
          setMps(uniqueMps);
        } catch (err) {
          console.error('Error fetching MPs:', err);
        }
      };
      fetchMps();
    } else {
      setMps([]);
      setSelectedMp(null);
      setSpecs([]);
      setSelectedSpec(null);
      setInspectionData([]);
    }
  }, [selectedConfig]);

  // Fetch variable inspections when an MP is selected
  useEffect(() => {
    if (selectedConfig && selectedMp) {
      const fetchSpecs = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/specs/by-config-mp/${selectedConfig}/${selectedMp}`);
          const variableSpecs = response.data.filter(spec => spec.type === 'Variable');
          setSpecs(variableSpecs);
        } catch (err) {
          console.error('Error fetching specs:', err);
        }
      };
      fetchSpecs();
    } else {
      setSpecs([]);
      setSelectedSpec(null);
      setInspectionData([]);
    }
  }, [selectedConfig, selectedMp]);

  // Fetch inspection data, calculate control limits, and CPK when a specification is selected
  useEffect(() => {
    if (selectedConfig && selectedMp && selectedSpec) {
      const fetchInspectionData = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/inspection_logs/by-config-mp-spec/${selectedConfig}/${selectedMp}/${selectedSpec}`
          );
          const rawData = response.data.map(log => log.inspection_value);
          const data = rawData.filter(val => val !== null && !isNaN(val) && val !== undefined);

          if (data.length === 0) {
            setInspectionData([]);
            setMean(null);
            setUcl(null);
            setLcl(null);
            setStdDev(null);
            setCpk(null);
            return;
          }

          setInspectionData(data);

          const spec = specs.find(s => s.spec_name === selectedSpec);
          const lslValue = parseFloat(spec.lower_spec);
          const uslValue = parseFloat(spec.upper_spec);

          if (isNaN(lslValue) || isNaN(uslValue) || lslValue >= uslValue) {
            console.warn('Invalid specification limits:', { lsl: lslValue, usl: uslValue });
            setLsl(null);
            setUsl(null);
            setCpk(null);
            return;
          }

          setLsl(lslValue);
          setUsl(uslValue);

          const meanValue = data.reduce((sum, val) => sum + val, 0) / data.length;
          setMean(meanValue);

          if (data.length > 1) {
            const movingRanges = data.slice(1).map((val, idx) => Math.abs(val - data[idx]));
            const mrBar = movingRanges.reduce((sum, mr) => sum + mr, 0) / movingRanges.length;
            const uclValue = meanValue + 2.66 * mrBar;
            const lclValue = meanValue - 2.66 * mrBar;
            setUcl(uclValue);
            setLcl(lclValue);

            // Calculate standard deviation (using moving range for consistency)
            const stdDevValue = mrBar / 1.128; // Approximate std dev from moving range (d2 for n=2)
            setStdDev(stdDevValue);
          } else {
            setUcl(null);
            setLcl(null);
            setStdDev(null);
          }

          if (lslValue !== null && uslValue !== null) {
            const stdDevValue = data.length > 1 ? Math.sqrt(
              data.reduce((sum, val) => sum + Math.pow(val - meanValue, 2), 0) / (data.length - 1)
            ) : 0;

            if (stdDevValue === 0) {
              setCpk(0); // No variability, CPK is 0
            } else {
              const cpkUpper = (uslValue - meanValue) / (3 * stdDevValue);
              const cpkLower = (meanValue - lslValue) / (3 * stdDevValue);
              const calculatedCpk = Math.max(0, Math.min(cpkUpper, cpkLower));
              setCpk(calculatedCpk.toFixed(2) || '0.00');
            }
          } else {
            setCpk(null);
            console.warn('CPK not calculated due to missing or invalid specification limits');
          }
        } catch (err) {
          console.error('Error fetching inspection data:', err);
          setInspectionData([]);
          setMean(null);
          setUcl(null);
          setLcl(null);
          setStdDev(null);
          setCpk(null);
          setError('Error fetching inspection data: ' + err.message);
        }
      };
      fetchInspectionData();
    } else {
      setInspectionData([]);
      setMean(null);
      setUcl(null);
      setLcl(null);
      setStdDev(null);
      setCpk(null);
    }
  }, [selectedConfig, selectedMp, selectedSpec, specs]);

  // Fetch normality test results
  const fetchNormalityTest = async () => {
    if (!selectedConfig || !selectedMp || !selectedSpec) return;

    setNormalityLoading(true);
    setNormalityError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/test/normality/${selectedConfig}/${selectedMp}/${selectedSpec}`,
        { withCredentials: true }
      );
      setNormalityData(response.data);
    } catch (err) {
      setNormalityError('Failed to fetch normality test results: ' + (err.response?.data?.error || err.message));
    } finally {
      setNormalityLoading(false);
    }
  };

  // Define chart data for the moving range chart
// ... (previous state, useEffects, and other code remain unchanged)

// Define chart data for the moving range chart (optional, shown when toggled)
const movingRangeData = inspectionData.length > 1 ? {
  labels: inspectionData.slice(1).map((_, index) => `Unit ${index + 2}`),
  datasets: (() => {
    const ranges = inspectionData.slice(1).map((val, idx) => Math.abs(val - inspectionData[idx]));
    const meanMR = ranges.reduce((sum, val) => sum + val, 0) / ranges.length;
    const uclMR = mean ? meanMR + 3.27 * meanMR : null;
    const lclMR = mean ? Math.max(0, meanMR - 3.27 * meanMR) : null;

    return [
      {
        label: 'Moving Range',
        data: ranges,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: false,
        tension: 0,
        pointRadius: 4,
      },
      mean && {
        label: 'Mean MR',
        data: Array(ranges.length).fill(meanMR),
        borderColor: 'green',
        borderDash: [5, 5],
        borderWidth: 2,
      },
      ucl && {
        label: 'UCL MR',
        data: Array(ranges.length).fill(uclMR),
        borderColor: 'red',
        borderDash: [10, 5],
        borderWidth: 2,
      },
      lcl && {
        label: 'LCL MR',
        data: Array(ranges.length).fill(lclMR),
        borderColor: 'red',
        borderDash: [10, 5],
        borderWidth: 2,
      },
    ].filter(Boolean); // Remove null datasets
  })(),
} : null;

// ... (chartData, chartOptions, movingRangeOptions, histogramData, histogramOptions, qqPlotRef, renderQQPlot, useEffect for Q-Q plot, and return statement remain unchanged)

  // Define chart data and options for the control chart
  const chartData = {
    labels: inspectionData.map((_, index) => `Unit ${index + 1}`),
    datasets: [
      {
        label: 'Inspection Values',
        data: inspectionData,
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: false,
        tension: 0,
        pointRadius: 4,
      },
      mean !== null && {
        label: 'Mean',
        data: Array(inspectionData.length).fill(mean),
        borderColor: 'green',
        borderDash: [5, 5],
        borderWidth: 2,
      },
      ucl !== null && {
        label: 'UCL',
        data: Array(inspectionData.length).fill(ucl),
        borderColor: 'red',
        borderDash: [10, 5],
        borderWidth: 2,
      },
      lcl !== null && {
        label: 'LCL',
        data: Array(inspectionData.length).fill(lcl),
        borderColor: 'red',
        borderDash: [10, 5],
        borderWidth: 2,
      },
      usl !== null && {
        label: 'USL',
        data: Array(inspectionData.length).fill(usl),
        borderColor: 'orange',
        borderDash: [5, 5],
        borderWidth: 2,
      },
      lsl !== null && {
        label: 'LSL',
        data: Array(inspectionData.length).fill(lsl),
        borderColor: 'orange',
        borderDash: [5, 5],
        borderWidth: 2,
      },
      showStdDev && stdDev !== null && {
        label: '+/- 1 Std Dev',
        data: [
          Array(inspectionData.length).fill(mean - stdDev),
          Array(inspectionData.length).fill(mean + stdDev)
        ].flat(),
        borderColor: 'purple',
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
      },
    ].filter(Boolean), // Remove null datasets
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true, // Changed to true to maintain a better aspect ratio
    aspectRatio: 2, // Adjust this value (e.g., 2 for wider than tall, 1 for square) to control the chart's shape
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 20, font: { size: 14 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'Value', font: { size: 14 } },
        beginAtZero: false,
        grid: { color: 'rgba(0, 0, 0, 0.1)', borderDash: [5, 5] }
      },
      x: {
        title: { display: true, text: 'Units', font: { size: 14 } },
        ticks: { autoSkip: true, maxRotation: 45, minRotation: 45 }
      }
    },
    interaction: { mode: 'nearest', intersect: true }
  };
  const movingRangeOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { boxWidth: 20, font: { size: 14 } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'Moving Range', font: { size: 14 } },
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)', borderDash: [5, 5] }
      },
      x: {
        title: { display: true, text: 'Units', font: { size: 14 } },
        ticks: { autoSkip: true, maxRotation: 45, minRotation: 45 }
      }
    },
    interaction: { mode: 'nearest', intersect: true },
    maintainAspectRatio: false,
  };

  // Define chart data for the histogram
  const histogramData = {
    labels: Array.from({ length: 20 }, (_, i) => {
      const min = Math.min(...inspectionData) || 0;
      const max = Math.max(...inspectionData) || 1;
      const binWidth = (max - min) / 20;
      return `${(min + i * binWidth).toFixed(2)} - ${(min + (i + 1) * binWidth).toFixed(2)}`;
    }),
    datasets: [{
      label: 'Inspection Values',
      data: Array.from({ length: 20 }, (_, i) => {
        const min = Math.min(...inspectionData) || 0;
        const max = Math.max(...inspectionData) || 1;
        const binWidth = (max - min) / 20;
        return inspectionData.filter(val => val >= min + i * binWidth && val < min + (i + 1) * binWidth).length;
      }),
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };

  const histogramOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { title: { display: true, text: 'Frequency', font: { size: 14 } } },
      x: { title: { display: true, text: 'Value', font: { size: 14 } } },
    },
  };

  // Ref for the Plotly Q-Q plot div
  const qqPlotRef = useRef(null);

  // Function to render Q-Q plot using Plotly.js
  const renderQQPlot = (data, container) => {
    if (!data || !data.qq_plot_data || !data.qq_plot_data[data.testType]) {
      console.warn('Insufficient or invalid data for Q-Q plot:', data);
      return;
    }

    const testData = data.qq_plot_data[data.testType];
    if (!testData.sample_quantiles || testData.sample_quantiles.length < 2) {
      console.warn('Insufficient data for Q-Q plot:', testData);
      return;
    }

    const { sample_quantiles, theoretical_quantiles } = testData;

    const plotData = [
      {
        x: theoretical_quantiles,
        y: sample_quantiles,
        mode: 'markers',
        name: 'Data Points',
        marker: { color: 'blue' }
      },
      {
        x: [Math.min(...theoretical_quantiles), Math.max(...theoretical_quantiles)],
        y: [Math.min(...sample_quantiles), Math.max(...sample_quantiles)],
        mode: 'lines',
        name: 'y=x line',
        line: { color: 'red', dash: 'dash' }
      }
    ];

    const layout = {
      title: `${data.testType === 'shapiro_wilk' ? 'Shapiro-Wilk' : data.testType === 'anderson_darling' ? 'Anderson-Darling' : 'Johnson'} Q-Q Plot`,
      xaxis: { title: 'Theoretical Quantiles', titlefont: { size: 14 } },
      yaxis: { title: 'Sample Quantiles', titlefont: { size: 14 } },
      showlegend: true,
      grid: { rows: 1, columns: 1 }
    };

    Plotly.newPlot(container, plotData, layout, { responsive: true });
  };

  // Render Q-Q plot when normalityData changes
  useEffect(() => {
    console.log('Normality Data:', normalityData);
    if (normalityData && qqPlotRef.current && normalityData.qq_plot_data && normalityData.qq_plot_data[testType]) {
      renderQQPlot({ ...normalityData, testType }, qqPlotRef.current);
    } else {
      console.warn('Normality data or Q-Q plot data is missing or invalid:', normalityData);
    }
  }, [normalityData, testType]);

  // Render the component
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar: Configuration Numbers, MPs, and Inspections */}
      <div className="w-1/4 p-4 bg-white shadow-md">
        <h2 className="text-xl font-bold mb-4">Configurations</h2>
        {loading ? (
          <p>Loading configurations...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : configNumbers.length > 0 ? (
          <div className="space-y-2">
            {configNumbers.map(config => (
              <div
                key={config}
                className={`p-2 cursor-pointer rounded ${
                  selectedConfig === config ? 'bg-blue-200' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedConfig(config)}
              >
                {config}
              </div>
            ))}
          </div>
        ) : (
          <p>No configurations available.</p>
        )}

        {selectedConfig && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">MPs for {selectedConfig}</h3>
            <div className="space-y-2">
              {mps.map(mp => (
                <div
                  key={mp}
                  className={`p-2 cursor-pointer rounded ${
                    selectedMp === mp ? 'bg-blue-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedMp(mp)}
                >
                  {mp}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMp && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Variable Inspections for {selectedMp}</h3>
            <div className="space-y-2">
              {specs.map(spec => (
                <div
                  key={spec.spec_name}
                  className={`p-2 cursor-pointer rounded ${
                    selectedSpec === spec.spec_name ? 'bg-blue-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSpec(spec.spec_name)}
                >
                  {spec.spec_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Side: Control Chart and Normality Testing */}
      <div className="w-3/4 p-4">
        {selectedSpec ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Control Chart for {selectedSpec}</h2>
            {inspectionData.length > 0 ? (
              <>
                <div className="mb-4 h-96"> {/* Added a fixed height of 384px (h-96 in Tailwind) for better vertical spacing */}
                  <Line data={chartData} options={chartOptions} />
                </div>
                {/* Control Chart Options */}
                <div className="mb-4 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={showStdDev}
                      onChange={(e) => setShowStdDev(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show ±1 Std Dev</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={showMovingRange}
                      onChange={(e) => setShowMovingRange(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Moving Range Chart</span>
                  </label>
                </div>
                {showMovingRange && inspectionData.length > 1 && movingRangeData && (
                  <div className="mb-4 h-96"> {/* Added a fixed height for the moving range chart as well */}
                    <Line data={movingRangeData} options={movingRangeOptions} />
                  </div>
                )}
              </>
            ) : (
              <p>No inspection data available for this specification.</p>
            )}
            {cpk !== null && (
              <p className="mt-4 text-lg font-semibold">CPK: {cpk}</p>
            )}
            {cpk === null && <p className="mt-4 text-gray-500">CPK: Not calculable (insufficient or invalid data)</p>}
            {stdDev !== null && (
              <p className="mt-2 text-sm text-gray-600">Standard Deviation: {stdDev.toFixed(4)}</p>
            )}

            {/* Collapsible Normality Testing Section */}
            <div className="mt-6">
              <button
                onClick={() => setShowNormality(!showNormality)}
                className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-between"
              >
                <span className="text-lg font-semibold">Normality Testing</span>
                <span>{showNormality ? '▼' : '▶'}</span>
              </button>
              {showNormality && (
                <div className="mt-4 space-y-4">
                  <div className="mb-4">
                    <label className="mr-2">Test Type:</label>
                    <select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="shapiro_wilk">Shapiro-Wilk</option>
                      <option value="anderson_darling">Anderson-Darling</option>
                      <option value="johnson">Johnson</option>
                    </select>
                    <button
                      onClick={fetchNormalityTest}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
                      disabled={normalityLoading}
                    >
                      {normalityLoading ? 'Testing...' : 'Check Normality'}
                    </button>
                  </div>

                  {normalityError && <p className="text-red-500">{normalityError}</p>}

                  {normalityData && !normalityLoading && (
                    <div className="space-y-4">
                      {/* Test Result */}
                      <p className="text-lg font-medium">
                        {testType === 'shapiro_wilk'
                          ? `Shapiro-Wilk: Statistic = ${normalityData.tests.shapiro_wilk.statistic.toFixed(4)}, p-value = ${normalityData.tests.shapiro_wilk.p_value.toFixed(4)} - ${normalityData.tests.shapiro_wilk.normality}`
                          : testType === 'anderson_darling'
                          ? `Anderson-Darling: Statistic = ${normalityData.tests.anderson_darling.statistic.toFixed(4)}, p-value = ${normalityData.tests.anderson_darling.p_value.toFixed(4)} - ${normalityData.tests.anderson_darling.normality}`
                          : `Johnson: Statistic = ${normalityData.tests.johnson.statistic.toFixed(4)}, p-value = ${normalityData.tests.johnson.p_value.toFixed(4)} - ${normalityData.tests.johnson.normality}`}
                      </p>

                      {/* Additional Anderson-Darling and Johnson Info */}
                      {testType === 'anderson_darling' && (
                        <p className="text-sm text-gray-600">
                          Critical Values: {normalityData.tests.anderson_darling.critical_values.join(', ')} at Significance Levels: {normalityData.tests.anderson_darling.significance_levels.join(', ')}%
                        </p>
                      )}
                      {testType === 'johnson' && normalityData.tests.johnson.transformation_params && (
                        <p className="text-sm text-gray-600">
                          Transformation Parameter (λ): {normalityData.tests.johnson.transformation_params.lambda_.toFixed(4)}
                        </p>
                      )}

                      {/* Histogram */}
                      <div className="mb-4">
                        <h4 className="text-md font-semibold mb-2">Histogram</h4>
                        <Bar data={histogramData} options={histogramOptions} />
                      </div>

                      {/* Q-Q Plot (Dynamic Plotly Rendering) */}
                      <div className="mb-4">
                        <h4 className="text-md font-semibold mb-2">Q-Q Plot</h4>
                        <div ref={qqPlotRef} className="w-full h-96 bg-white rounded-lg shadow-inner"></div>
                        {(!normalityData.qq_plot_data || !normalityData.qq_plot_data[testType] || !normalityData.qq_plot_data[testType].sample_quantiles || normalityData.qq_plot_data[testType].sample_quantiles.length < 2) && (
                          <p>No Q-Q plot available for {testType} (insufficient data).</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a specification to view the control chart.</p>
        )}
      </div>
      </div>
    );
  }