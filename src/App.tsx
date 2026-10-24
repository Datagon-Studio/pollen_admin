import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { StaffRoute } from "@/components/auth/StaffRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import SignIn from "@/app/auth/SignIn";
import ResetPassword from "@/app/auth/ResetPassword";
import Forbidden from "@/app/Forbidden";
import NotFound from "@/app/NotFound";
import Dashboard from "@/app/Dashboard";
import AccountsList from "@/app/accounts/AccountsList";
import AccountDetail from "@/app/accounts/AccountDetail";
import MembersList from "@/app/members/MembersList";
import MemberDetail from "@/app/members/MemberDetail";
import FundsList from "@/app/funds/FundsList";
import FundDetail from "@/app/funds/FundDetail";
import ContributionsList from "@/app/contributions/ContributionsList";
import ContributionDetail from "@/app/contributions/ContributionDetail";
import SettlementsList from "@/app/settlements/SettlementsList";
import SettlementDetail from "@/app/settlements/SettlementDetail";
import KycQueue from "@/app/kyc/KycQueue";
import KycDetail from "@/app/kyc/KycDetail";
import StaffManagement from "@/app/settings/StaffManagement";
import ReportsPage from "@/app/reports/ReportsPage";
import AuditLogViewer from "@/app/audit/AuditLogViewer";
import ProfilePage from "@/app/profile/ProfilePage";

const queryClient = new QueryClient();

function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <StaffRoute>
      <AdminLayout>{children}</AdminLayout>
    </StaffRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forbidden" element={<Forbidden />} />

          <Route
            path="/"
            element={
              <StaffShell>
                <Dashboard />
              </StaffShell>
            }
          />
          <Route
            path="/accounts"
            element={
              <StaffShell>
                <AccountsList />
              </StaffShell>
            }
          />
          <Route
            path="/accounts/:id"
            element={
              <StaffShell>
                <AccountDetail />
              </StaffShell>
            }
          />
          <Route
            path="/members"
            element={
              <StaffShell>
                <MembersList />
              </StaffShell>
            }
          />
          <Route
            path="/members/:id"
            element={
              <StaffShell>
                <MemberDetail />
              </StaffShell>
            }
          />
          <Route
            path="/funds"
            element={
              <StaffShell>
                <FundsList />
              </StaffShell>
            }
          />
          <Route
            path="/funds/:id"
            element={
              <StaffShell>
                <FundDetail />
              </StaffShell>
            }
          />
          <Route
            path="/contributions"
            element={
              <StaffShell>
                <ContributionsList />
              </StaffShell>
            }
          />
          <Route
            path="/contributions/:id"
            element={
              <StaffShell>
                <ContributionDetail />
              </StaffShell>
            }
          />
          <Route
            path="/reports"
            element={
              <StaffShell>
                <ReportsPage />
              </StaffShell>
            }
          />
          <Route
            path="/audit"
            element={
              <StaffShell>
                <AuditLogViewer />
              </StaffShell>
            }
          />
          <Route
            path="/settlements"
            element={
              <StaffRoute requireCompliance>
                <AdminLayout>
                  <SettlementsList />
                </AdminLayout>
              </StaffRoute>
            }
          />
          <Route
            path="/settlements/:id"
            element={
              <StaffRoute requireCompliance>
                <AdminLayout>
                  <SettlementDetail />
                </AdminLayout>
              </StaffRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <StaffRoute requireCompliance>
                <AdminLayout>
                  <KycQueue />
                </AdminLayout>
              </StaffRoute>
            }
          />
          <Route
            path="/kyc/:id"
            element={
              <StaffRoute requireCompliance>
                <AdminLayout>
                  <KycDetail />
                </AdminLayout>
              </StaffRoute>
            }
          />
          <Route
            path="/settings/staff"
            element={
              <StaffRoute requirePlatformAdmin>
                <AdminLayout>
                  <StaffManagement />
                </AdminLayout>
              </StaffRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <StaffShell>
                <ProfilePage />
              </StaffShell>
            }
          />

          <Route path="/settings" element={<Navigate to="/settings/staff" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </ThemeProvider>
  );
}
