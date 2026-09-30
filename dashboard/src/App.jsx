import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Overview from './pages/Overview';
import Devices from './pages/Devices';
import Traffic from './pages/Traffic';
import Protocols from './pages/Protocols';
import Anomalies from './pages/Anomalies';
import Historical from './pages/Historical';
import PipelineFlow from './pages/PipelineFlow';
import Topology from './pages/Topology';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/pipeline" element={<PipelineFlow />} />
          <Route path="/topology" element={<Topology />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/traffic" element={<Traffic />} />
          <Route path="/protocols" element={<Protocols />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/historical" element={<Historical />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
