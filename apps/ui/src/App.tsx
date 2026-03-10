import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RunsList from "./components/RunsList";
import RunDetail from "./components/RunDetail";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RunsList />} />
        <Route path="/runs/:runId" element={<RunDetail />} />
      </Routes>
    </Layout>
  );
}
