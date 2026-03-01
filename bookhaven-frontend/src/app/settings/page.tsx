'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Shield, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, setUser, refreshToken, logout } = useAuthStore();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>('profile');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '' },
  });

  const onProfileSave = async (data: ProfileForm) => {
    try {
      const res = await authApi.updateProfile(data);
      setUser(res.data.data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await authApi.logout(refreshToken || '');
    } catch {}
    logout();
    toast.success('Logged out from all devices.');
    router.push('/');
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900">Settings</h1>
        <p className="font-sans text-slate-500 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-48 flex-shrink-0">
          <ul className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActiveSection(id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors ${
                    activeSection === id
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 max-w-xl">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
              <h2 className="font-display text-xl font-bold text-slate-900 mb-5">Profile Information</h2>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-display font-bold text-2xl">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-sans font-medium text-slate-900">{user?.name}</p>
                  <p className="font-sans text-sm text-slate-500">{user?.email}</p>
                  <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full capitalize mt-1 inline-block ${
                    user?.role === 'admin' ? 'bg-red-50 text-red-700' :
                    user?.role === 'librarian' ? 'bg-teal-50 text-violet-700':
                    'bg-slate-100 text-teal-600'
                  }`}>
                    {user?.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onProfileSave)} className="space-y-4">
                <Input
                  label="Full Name"
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.name?.message}
                  {...register('name')}
                />
                <Input
                  label="Email Address"
                  type="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={user?.email || ''}
                  disabled
                  hint="Email cannot be changed after registration."
                />
                <Button type="submit" loading={isSubmitting}>
                  Save Changes
                </Button>
              </form>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
                <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Session Management</h2>
                <p className="font-sans text-sm text-slate-500 mb-5">
                  Sign out from all devices where you're currently logged in. This will revoke all active sessions.
                </p>
                <Button
                  variant="danger"
                  onClick={handleLogoutAll}
                  icon={<LogOut className="w-4 h-4" />}
                >
                  Sign Out All Devices
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-sans font-semibold text-amber-800 mb-1">Account Security Tips</h3>
                <ul className="space-y-1 text-sm font-sans text-amber-700">
                  <li>• Use a strong, unique password for your account.</li>
                  <li>• Never share your login credentials with anyone.</li>
                  <li>• Sign out when using shared or public devices.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
