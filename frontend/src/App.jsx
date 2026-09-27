import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoginPage from "./pages/LoginPage";
import VendorDashboardPage from "./pages/VendorDashboardPage";
import VendorBidsPage from "./pages/VendorBidsPage";
import VendorTendersPage from "./pages/VendorTendersPage";
import VendorTenderDetailPage from "./pages/VendorTenderDetailPage";
import VendorBidSubmissionPage from "./pages/VendorBidSubmissionPage";
import DashboardPage from "./pages/DashboardPage";
import TendersPage from "./pages/TendersPage";
import TenderDetailPage from "./pages/TenderDetailPage";
import EvaluationPage from "./pages/EvaluationPage";
import VendorsPage from "./pages/VendorsPage";
import VendorProfilePage from "./pages/VendorProfilePage";
import ContractAwardPage from "./pages/ContractAwardPage";
import ContractDetailsPage from "./pages/ContractDetailsPage";

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === "vendor" ? "/vendor/dashboard" : "/"} replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/vendor/dashboard"
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/tenders"
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorTendersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/bids"
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorBidsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/tenders/:id"
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorTenderDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendor/bids/:bidId/submit"
                element={
                  <ProtectedRoute allowedRole="vendor">
                    <VendorBidSubmissionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenders"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <TendersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tenders/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <TenderDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bids/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <EvaluationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evaluations/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <EvaluationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <VendorsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vendors/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <VendorProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/awards/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <ContractAwardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <ProtectedRoute allowedRole="officer">
                    <ContractDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
