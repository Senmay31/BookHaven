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
