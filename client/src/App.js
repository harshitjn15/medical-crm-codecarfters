import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import PatientList from './components/patients/PatientList';
import PatientDetail from './components/patients/PatientDetail';
import PrescriptionList from './components/prescriptions/PrescriptionList';
import PrescriptionForm from './components/prescriptions/PrescriptionForm';
import FollowupList from './components/followups/FollowupList';
import AppointmentList from './components/appointments/AppointmentList';
import InvoiceList from './components/invoices/InvoiceList';
import InvoiceForm from './components/invoices/InvoiceForm';
import InvoicePrint from './components/invoices/InvoicePrint';
import ClinicSettings from './components/clinics/ClinicSettings';
import ProcedureLibrary from './components/procedures/ProcedureLibrary';
import TreatmentPlanList from './components/treatmentplans/TreatmentPlanList';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';
import AccessDenied from './components/auth/AccessDenied';
import PublicHome from './components/public/PublicHome';
import BookAppointment from './components/public/BookAppointment';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  return token ? children : <Navigate to="/login" replace />;
};

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <AccessDenied />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"     element={<PublicHome />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/login" element={<Login />} />

          <Route path="/admin" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard"              element={<Dashboard />} />
            <Route path="patients"               element={<PatientList />} />
            <Route path="patients/:id"           element={<PatientDetail />} />
            <Route path="prescriptions"          element={<PrescriptionList />} />
            <Route path="prescriptions/new"      element={<PrescriptionForm />} />
            <Route path="prescriptions/:id/edit" element={<PrescriptionForm />} />
            <Route path="followups"              element={<FollowupList />} />
            <Route path="appointments"           element={<AppointmentList />} />
            <Route path="invoices"               element={<InvoiceList />} />
            <Route path="invoices/new"           element={<InvoiceForm />} />
            <Route path="invoices/:id"           element={<InvoicePrint />} />
            <Route path="invoices/:id/edit"      element={<InvoiceForm />} />
            <Route path="treatmentplans"         element={<TreatmentPlanList />} />
            <Route path="procedures"             element={<ProcedureLibrary />} />
            <Route path="settings"              element={<ClinicSettings />} />
            <Route path="superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
