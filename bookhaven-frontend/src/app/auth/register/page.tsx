"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, BookOpen, Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "Must be at least 8 characters")
      .regex(/(?=.*[a-z])/, "Must include a lowercase letter")
      .regex(/(?=.*[A-Z])/, "Must include an uppercase letter")
      .regex(/(?=.*\d)/, "Must include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch("password", "");

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthLabels = [
    "",
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];
  const strengthColors = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-green-600",
  ];

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome to BookHaven, ${user.name}!`);
      router.replace("/dashboard");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="relative flex flex-col justify-between h-full p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              The Book Haven
            </span>
          </Link>

          <div>
            <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
              Join the community of knowledge seekers.
            </h2>
            <p className="font-body text-white/60 text-lg mb-8">
              Create your account in seconds and get instant access to our
              entire archive.
            </p>
            <div className="space-y-3">
              {[
                "Unlimited access to thousands of books.",
                "Personal reading shelf & progress tracking.",
                "Personalized recommendations.",
                "Read in-browser — no downloads needed.",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-parchment-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="font-sans text-white/80 text-sm">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-white/30 font-sans text-xs">
            Trusted by more than a 1000 readers worldwide!
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-parchment-50 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-up">
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
                Create your account
              </h2>
              <p className="font-sans text-slate-500 mt-2">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-teal-600 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Full name"
                type="text"
                placeholder="Chester P. Bello"
                leftIcon={<User className="w-4 h-4" />}
                error={errors.name?.message}
                {...register("name")}
              />

              <Input
                label="Email address"
                type="email"
                placeholder="myemail@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register("email")}
              />

              <div>
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
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
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= strength ? strengthColors[strength] : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs font-sans mt-1 ${strength >= 4 ? "text-green-600" : strength >= 3 ? "text-yellow-600" : "text-red-500"}`}
                    >
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <Button type="submit" fullWidth loading={isSubmitting} size="lg">
                Create my account
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

            <p className="mt-6 text-xs font-sans text-slate-400 text-center">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-teal-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-teal-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
