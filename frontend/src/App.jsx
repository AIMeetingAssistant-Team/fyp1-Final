// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import ScheduleMeeting from "./pages/ScheduleMeeting";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import MainWorkspace from "./pages/MainWorkspace";
import ResetPassword from "./pages/ResetPassword";
import ProfilePage from "./pages/ProfilePage";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import { AIProvider } from "./context/AIContext";
import Meetings from "./pages/Meetings";
import DocumentList from "./pages/DocumentList";
import AuthForm from "./pages/AuthForm";
import Calendar from "./pages/Calendar";
import MeetingDetails from "./pages/MeetingDetails";
import VideoMeeting from "./pages/VideoMeeting";
import RealtimeRecorder from "./pages/RealtimeRecorder";
import UploadRecordings from "./pages/UploadRecordings";
import MeetingAIPanel from "./pages/MeetingAIPanel";
import Tasks from "./pages/Tasks";
import JoinMeeting from "./pages/JoinMeeting";

function PrivateRoute({ element }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <p className="text-center mt-10">Loading...</p>;
  return user ? element : <Navigate to="/signin" />;
}

function PublicRoute({ element }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <p className="text-center mt-10">Loading...</p>;
  return user ? <Navigate to="/workspace" /> : element;
}

export default function App() {
  return (
    <Router>
      <AIProvider>
        <Layout>
          <Routes>
            {/* Default / Home */}
            <Route path="/" element={<Home />} />

            {/* Public Routes */}
            <Route path="/signup" element={<PublicRoute element={<AuthForm mode="signup" />} />} />
            <Route path="/signin" element={<PublicRoute element={<AuthForm mode="signin" />} />} />
            <Route path="/verify-email" element={<PublicRoute element={<VerifyEmail />} />} />
            <Route path="/forgot-password" element={<PublicRoute element={<ForgotPassword />} />} />
            <Route path="/reset-password/:token" element={<PublicRoute element={<ResetPassword />} />} />

            {/* Protected Routes */}
            <Route path="/profile" element={<PrivateRoute element={<ProfilePage />} />} />
            <Route path="/workspace" element={<PrivateRoute element={<MainWorkspace />} />} />
            <Route path="/dashboard" element={<PrivateRoute element={<Dashboard />} />} />
            <Route path="/join" element={<PrivateRoute element={<JoinMeeting />} />} />
            <Route path="/schedule" element={<PrivateRoute element={<ScheduleMeeting />} />} />
            <Route path="/meetings" element={<PrivateRoute element={<Meetings />} />} />
            <Route path="/meetings/:id" element={<PrivateRoute element={<MeetingDetails />} />} />
            <Route path="/meetings/:id/ai" element={<PrivateRoute element={<MeetingAIPanel />} />} />
            <Route path="/calendar" element={<PrivateRoute element={<Calendar />} />} />
            <Route path="/realtime-recording" element={<PrivateRoute element={<RealtimeRecorder />} />} />
            <Route path="/upload-recordings" element={<PrivateRoute element={<UploadRecordings />} />} />
            <Route path="/video-meeting/:meetingId" element={<VideoMeeting />} />
            <Route path="/documents" element={<PrivateRoute element={<DocumentList />} />} />
            <Route path="/tasks" element={<PrivateRoute element={<Tasks />} />} />

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </AIProvider>
    </Router>
  );
}