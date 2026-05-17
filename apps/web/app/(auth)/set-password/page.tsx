import { Suspense } from "react";
import SetPasswordPage from "@/features/auth/pages/SetPasswordPage";

export default function SetPasswordRoute() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm">Loading...</div>}>
      <SetPasswordPage />
    </Suspense>
  );
}