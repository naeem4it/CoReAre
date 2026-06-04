'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/shared/api/api-client';

export default function SignupPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [businessName, setBusinessName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Status states
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Parallax effect for visual side
  React.useEffect(() => {
    const visualSide = document.getElementById('visual-side');
    if (!visualSide) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 20;
      const yPos = (clientY / window.innerHeight - 0.5) * 20;
      const bgImage = visualSide.querySelector('img');
      if (bgImage) {
        bgImage.style.transform = `scale(1.1) translate(${xPos}px, ${yPos}px)`;
        bgImage.style.transition = 'transform 0.1s ease-out';
      }
    };

    visualSide.addEventListener('mousemove', handleMouseMove);
    return () => {
      visualSide.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Call registration API
      const registerRes = await apiClient.post('/auth/local/register', {
        username: email, // Use email as unique username identifier
        email: email,
        password: password,
        fullName: fullName,
        businessName: businessName,
      });

      const { jwt, user } = registerRes.data;

      if (jwt) {
        localStorage.setItem('token', jwt);
        localStorage.setItem('dbarc-token', jwt);
        localStorage.setItem('user', JSON.stringify(user));

        // 2. Call user update API to store additional fields if required
        try {
          await apiClient.put(`/users/${user.id}`, {
            username: fullName, // update display username to Full Name
            businessName: businessName,
          });
        } catch (updateErr) {
          console.warn('Profile update warning:', updateErr);
        }

        // Redirect to dashboard
        router.push('/');
      } else {
        setError('Registration succeeded but token was not returned.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const message = err.response?.data?.error?.message || 'Failed to register account. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-background text-on-surface">
      <style dangerouslySetInnerHTML={{
        __html: `
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .form-gradient {
            background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(247,249,251,1) 100%);
        }
        input:focus {
            box-shadow: 0 0 0 2px #0052ff !important;
            outline: none !important;
        }
      `}} />

      {/* Visual Side (Split Screen) */}
      <section id="visual-side" className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-xl overflow-hidden bg-primary-container min-h-screen">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            alt="Fly Courier Global Operations"
            className="w-full h-full object-cover mix-blend-overlay opacity-40"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgDrio6ZxInvZg84qnez-kMOHgZzaIpqPE8NFgN2_85IPeWEPQH2GnIsthl8Yyvy4-Bx2-7Pr02KftwbljI01mN4XqHAfA-O_MXh553-rO4HeMNUDdIQL4Ze-tgqrlN3TDpiDvAwPKaHzz6RYhngjsENiiKaugOC3KkWOhAQsaRznJ8FPQqb43nB8LVIRhqkHQwWjn2ZA2unJGqiaTD52JCsz1TgAwtyPWehnyLJBP5NBhmGoW8N0jvkoAmy1yeTpyYaXN6s8KRMM"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-fixed-dim/80 to-transparent"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-on-primary-container text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              flight_takeoff
            </span>
            <h1 className="font-headline-lg text-headline-lg font-extrabold text-on-primary-container tracking-tighter uppercase">
              LogisticsMastery
            </h1>
          </div>
        </div>

        <div className="relative z-10 mb-xl">
          <h2 className="font-display-lg text-display-lg text-on-primary-container mb-md">
            Precision in every mile. Performance in every package.
          </h2>
          <div className="flex gap-md items-center">
            <div className="flex -space-x-2">
              <img
                alt="Partner"
                className="w-10 h-10 rounded-full border-2 border-primary-container"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV3Ku5u96EI36KBWjWdgHp6VgSNLxIMp5l9aXj8s-g_Vx1p256C4nIxb2P6HiRYklXMUI1_XJxVccUvWFrfy-E7X5KVXQOqsNoGytkudmEOSv7MOhkRaNc6kucH54SX--kY49WPzRx47XOUMN79H-lCFsVN5aWjqzHVNdyKT-ESmild03NwJGrUXKq9YxikyCdZF0zB49hHn7hl7gqE7Pr27oxgVe0qiUDOeIMUEImPl8CVEHW__G8QFnTdoAjpmuh-d-OQ4V9GR4"
              />
              <img
                alt="Partner"
                className="w-10 h-10 rounded-full border-2 border-primary-container"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCPjuP07ps_z1170DMojEChnkom2ASUOaI3j2tg9qlDrV66GwPiZ2E5mKmUomIU15ZB1vQbiCtiBl9VrQ4LoLWkEz-1MjYyNu5fYaTEgBDYYJqZl0UlRt5FQ4AU-4nDCLfF6k9bmyVK7hx0GStDlKDeN4-m05eoQGwDxyLbfwy9TxAtYrGiARshvX4fw_8guKiv16YWcZwroOLP7f9v5jaZNDqzO_Mbm9EyDwnFzu54HIhUOZVk9sfvfkgY__NM2eopl0vkbNLkzpI"
              />
              <img
                alt="Partner"
                className="w-10 h-10 rounded-full border-2 border-primary-container"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm-aybIS957dmNQBsrRkamY-gpXU9BxuENXqZc-jiTRxQQGeB05d-zKrcgCYCWM2oCT5MvDCqLDAPVtvTMexyC0QDT_qAO093G2M2LPiXEw8SQ8-2PPT4zCD8wrS4X_pu3D3rIsA0zgQ39iY7Bxu-wrF2UaAehSlZ7lRTX_CdIT3sltToBnvAfRb4UoyHPUEf9yYfDQKVvCz1rWsb_vsy1bDvGtW6j028cCy4yxwktjt167Uk9PKgTgyLAxMn3wHnGKmBAM9w-tXE"
              />
            </div>
            <p className="font-body-md text-on-primary-container/80">
              Trusted by 2,400+ global enterprises for mission-critical logistics.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex justify-between items-center text-on-primary-container/60 font-label-md text-label-md uppercase tracking-widest">
          <span>Fly Courier Operations</span>
          <span>Est. 2024</span>
        </div>
      </section>

      {/* Form Side */}
      <section className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-md bg-surface border-l border-outline-variant/30">
        <div className="w-full max-w-[480px]">
          <div className="mb-lg">
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              Join the Fleet
            </h3>
            <p className="font-body-md text-on-surface-variant">
              Create your professional Fly Courier account to access real-time global terminal ops.
            </p>
          </div>

          {/* Error Container */}
          {error && (
            <div className="mb-md p-sm bg-error-container text-on-error-container text-body-md rounded-lg flex items-center gap-xs border border-error/20">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-md" onSubmit={handleSignup}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    person
                  </span>
                  <input
                    className="w-full h-10 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                    placeholder="John Doe"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Business Name
                </label>
                <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    corporate_fare
                  </span>
                  <input
                    className="w-full h-10 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                    placeholder="Fly Courier Ltd."
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  mail
                </span>
                <input
                  className="w-full h-10 pl-10 pr-md bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                  placeholder="operations@flycourier.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Password
              </label>
              <div className="relative group transition-transform duration-200 focus-within:scale-[1.01]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  className="w-full h-10 pl-10 pr-12 bg-surface-container-low border border-outline-variant rounded-lg font-body-md focus:outline-none transition-all placeholder:text-outline/50 text-on-surface"
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-sm py-xs">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  className="w-5 h-5 text-primary border-outline-variant rounded-md focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="ml-1 text-label-md">
                <label className="font-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="terms">
                  I agree to the{' '}
                  <a className="text-primary font-bold hover:underline decoration-2 underline-offset-4 transition-all" href="#">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a className="text-primary font-bold hover:underline decoration-2 underline-offset-4 transition-all" href="#">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
            </div>

            <button
              className="w-full h-12 bg-primary-container text-on-primary-container font-headline-md text-headline-md rounded-xl hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                <>
                  Create Account
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-lg pt-lg border-t border-outline-variant flex flex-col items-center gap-md">
            <p className="font-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1" href="/login">
                Sign In
              </Link>
            </p>

            <div className="flex items-center gap-md w-full">
              <div className="h-[1px] bg-outline-variant flex-grow"></div>
              <span className="font-label-md text-label-md text-outline uppercase tracking-widest">
                Or authenticate via
              </span>
              <div className="h-[1px] bg-outline-variant flex-grow"></div>
            </div>

            <div className="grid grid-cols-2 gap-md w-full">
              <button
                className="flex items-center justify-center gap-sm h-10 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors font-label-md text-label-md bg-white cursor-pointer"
                type="button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="currentColor"
                  ></path>
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="currentColor"
                  ></path>
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="currentColor"
                  ></path>
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="currentColor"
                  ></path>
                </svg>
                Google
              </button>
              <button
                className="flex items-center justify-center gap-sm h-10 border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors font-label-md text-label-md bg-white cursor-pointer"
                type="button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    fill="currentColor"
                  ></path>
                </svg>
                GitHub
              </button>
            </div>
          </div>

          <footer className="mt-xl flex flex-wrap justify-center gap-md font-label-md text-label-md text-outline">
            <span>© 2024 Fly Courier LogisticsMastery</span>
            <a className="hover:text-primary transition-colors" href="#">
              Help Center
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              API Status
            </a>
          </footer>
        </div>
      </section>
    </main>
  );
}
