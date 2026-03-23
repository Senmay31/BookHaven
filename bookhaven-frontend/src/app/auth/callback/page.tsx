"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const error = searchParams.get("error");

      // Handle errors from backend
      if (error) {
        router.replace(`/auth/login?error=${error}`);
        return;
      }

      if (!accessToken || !refreshToken) {
        router.replace("/auth/login?error=missing_tokens");
        return;
      }

      try {
        // Fetch the full user profile using the access token
        const res = await authApi.getProfile(accessToken);
        const user = res.data.data.user;

        // Save everything to Zustand store
        setAuth(user, accessToken, refreshToken);

        // Redirect to dashboard
        router.replace("/dashboard");
      } catch {
        router.replace("/auth/login?error=profile_fetch_failed");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-sans text-slate-600">
          Signing you in with Google...
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
