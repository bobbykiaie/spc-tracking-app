import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Reports from "./components/Reports";
import SPCData from "./components/SPCData";

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/spc-data" element={<SPCData />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
