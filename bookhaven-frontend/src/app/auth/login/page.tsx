"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, BookOpen, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { useState, Suspense } from "react";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const schema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authApi.login(data);
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}!`);
      // router.replace('/dashboard');
      router.push(redirect);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Login failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex flex-col w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white font-display font-bold select-none"
              style={{
                fontSize: `${40 + (i % 4) * 20}px`,
                left: `${(i * 19) % 90}%`,
                top: `${(i * 27) % 90}%`,
                opacity: 0.3,
                transform: `rotate(${i % 2 === 0 ? 5 : -5}deg)`,
              }}
            >
              ❝
            </div>
          ))}
        </div>

        <div className="relative flex flex-col justify-between h-full p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              The Book Haven
            </span>
          </Link>

          <div>
            <blockquote className="font-display text-4xl font-bold text-white leading-tight mb-6">
              "Not all those who wander are lost — but great books help."
            </blockquote>
            <p className="font-body text-white/60 text-lg">
              Thousands of curated works waiting for you inside.
            </p>
          </div>

          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    i === 1 ? "#c9841e" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-parchment-50">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-slate-900">
              The Book Haven
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold text-slate-900">
                Welcome back
              </h2>
              <p className="font-sans text-slate-500 mt-2">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-teal-600 hover:underline font-medium"
                >
                  Create one for free
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                error={errors.password?.message}
                {...register("password")}
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                  <span className="text-sm font-sans text-slate-600">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-sans text-teal-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
                className="mt-2"
              >
                Sign in to your library
              </Button>
            </form>

            {/* Google Sign In Button */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 font-sans text-slate-500">
                    or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => authApi.googleLogin()}
                className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors font-sans text-sm font-medium text-slate-700 shadow-sm"
              >
                {/* Google SVG icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs font-sans text-slate-400">
                By signing in, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// export function Search() {
//   return (
//     <Suspense>
//       <LoginPage />
//     </Suspense>
//   );
// }

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
