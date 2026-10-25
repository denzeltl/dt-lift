"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatabase } from "@/context/DatabaseContext";
import { LogOut, Cloud, HardDrive, Smartphone } from "lucide-react";
import Logo from "@/components/Logo";

type BeforeInstallPromptEvent = Event & {
    prompt: () => void;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Page() {
    const { user, login, signup, logout, loginAsGuest, isLocalOnly, isLoading } = useDatabase();
    const router = useRouter();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [installable, setInstallable] = useState(
        typeof window !== "undefined" &&
            !!(window as unknown as Window & { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt,
    );

    // Redirect to dashboard if logged in, but stay on this page if they are looking at the Profile
    useEffect(() => {
        // If user is logged in and they are coming here fresh, they might want to see profile,
        // but default flow redirects to dashboard if they are not signed out.
        // We will let the BottomNav handle page navigation.
    }, [user]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const handleInstallAvailable = () => {
                setInstallable(true);
            };
            window.addEventListener("dt-lift-install-available", handleInstallAvailable);
            return () => window.removeEventListener("dt-lift-install-available", handleInstallAvailable);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError("");
        setAuthLoading(true);

        try {
            if (isSignUp) {
                const { error } = await signup(email, password, fullName);
                if (error) setAuthError(error.message || "Error signing up");
                else router.push("/dashboard");
            } else {
                const { error } = await login(email, password);
                if (error) setAuthError(error.message || "Error logging in");
                else router.push("/dashboard");
            }
        } catch (err) {
            setAuthError("An unexpected error occurred");
            console.error(err);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleInstallClick = async () => {
        if (typeof window !== "undefined") {
            const promptEvent = (window as unknown as Window & { deferredPrompt?: BeforeInstallPromptEvent })
                .deferredPrompt;
            if (!promptEvent) return;
            promptEvent.prompt();
            const { outcome } = await promptEvent.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            // Clear stored prompt (use undefined to satisfy typings)
            window.deferredPrompt = undefined;
            setInstallable(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
                <Logo className="h-14 w-14 motion-safe:animate-spin [animation-duration:1.4s]" />
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-500">Loading your log…</p>
            </div>
        );
    }

    // LOGGED IN: Profile View
    if (user) {
        return (
            <div className="space-y-5">
                <h1 className="text-4xl text-zinc-100">Account</h1>
                {/* Profile Card */}
                <div className="rounded-2xl p-5 slab">
                    <div className="flex items-center space-x-4">
                        <div className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[2.5px] border-zinc-800 bg-volt text-zinc-100 text-2xl">
                            {user.full_name ? user.full_name.substring(0, 2) : user.email.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-2xl text-zinc-100 break-words">{user.full_name || "DT Lift User"}</h2>
                            <p className="text-sm text-zinc-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Database Connection Status Card */}
                <div className="rounded-2xl p-5 space-y-4 slab">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Where your data lives</h3>
                    <div className="flex items-start space-x-3">
                        {isLocalOnly ? (
                            <>
                                <div className="rounded-lg border-2 border-zinc-800 bg-zinc-950 p-2.5 text-amber-400 mt-0.5">
                                    <HardDrive className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-zinc-100">On this device only</h4>
                                    <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                                        You&apos;re in guest mode. Templates and history are saved in this browser, so clearing site data deletes them.
                                    </p>
                                    <p className="text-sm text-amber-400 leading-relaxed mt-2 font-semibold">
                                        Sign up to back up your log and use it on other devices.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="rounded-lg border-2 border-zinc-800 bg-volt p-2.5 text-zinc-100 mt-0.5">
                                    <Cloud className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-zinc-100">Synced to the cloud</h4>
                                    <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                                        Every workout saves to your account as you log it, on any device.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* PWA Installer Option */}
                {installable && (
                    <button
                        onClick={handleInstallClick}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl p-5 text-left text-zinc-100 slab slab-press"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="shrink-0 rounded-xl border-2 border-zinc-800 bg-lime-400 p-2.5 text-white">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-100">Install DT Lift</h4>
                                <p className="text-sm text-zinc-500">
                                    Add it to your home screen. It opens full-screen and works offline.
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 rounded-full border-2 border-zinc-800 px-3 py-1 text-sm font-bold text-lime-400">Install</div>
                    </button>
                )}

                {/* Info & Credits */}
                <div className="flex flex-col items-center p-4 text-center text-xs text-zinc-500 space-y-1">
                    <Logo className="h-9 w-9 mb-2" />
                    <p className="font-mono font-semibold text-zinc-400">DT Lift v1.0.0</p>
                    <p>Created with Next.js, Tailwind v4 and Supabase</p>
                    <p className="text-zinc-600">All rights reserved &copy; 2026</p>
                </div>

                {/* Log Out Button */}
                <button
                    onClick={logout}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl border-2 border-red-400 bg-zinc-900 py-3.5 font-bold text-red-400 active:scale-[0.98] transition-transform"
                >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>Log out</span>
                </button>
            </div>
        );
    }

    // NOT LOGGED IN: Auth Form
    return (
        <div className="flex min-h-[85dvh] flex-col justify-center py-6">
            {/* Brand Header */}
            <div className="mb-8 flex items-center gap-4 animate-fade-in">
                <Logo className="h-24 w-24 shrink-0 motion-safe:animate-[plate-load_600ms_var(--ease-stamp)]" />
                <div className="min-w-0">
                    <span className="tag-volt inline-block -rotate-3 rounded-[4px] px-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider">
                        Gym tracker
                    </span>
                    <h1 className="mt-2 text-6xl leading-[0.85] text-zinc-100">DT Lift</h1>
                    <p className="mt-2 text-zinc-500">Log every set. Beat last week.</p>
                </div>
            </div>

            {/* Auth Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-6">
                {/* Toggle LogIn/SignUp tabs */}
                <div className="grid grid-cols-2 rounded-lg bg-zinc-950 p-1 border-2 border-zinc-800" role="tablist">
                    <button
                        onClick={() => {
                            setIsSignUp(false);
                            setAuthError("");
                        }}
                        role="tab"
                        aria-selected={!isSignUp}
                        className={`rounded-md py-2.5 text-sm font-bold uppercase tracking-wide transition-colors duration-150 ${
                            !isSignUp ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-100"
                        }`}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => {
                            setIsSignUp(true);
                            setAuthError("");
                        }}
                        role="tab"
                        aria-selected={isSignUp}
                        className={`rounded-md py-2.5 text-sm font-bold uppercase tracking-wide transition-colors duration-150 ${
                            isSignUp ? "bg-zinc-100 text-zinc-950" : "text-zinc-500 hover:text-zinc-100"
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {authError && (
                    <div role="alert" className="rounded-lg bg-red-950 border-2 border-red-400 p-3 text-center text-sm font-semibold text-red-400 animate-fade-in">
                        {authError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="space-y-1.5">
                            <label htmlFor="auth-name" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Full name
                            </label>
                            <input
                                id="auth-name"
                                autoComplete="name"
                                type="text"
                                required
                                placeholder="Juan Dela Cruz"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label htmlFor="auth-email" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Email
                        </label>
                        <input
                            id="auth-email"
                            autoComplete="email"
                            type="email"
                            required
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="auth-password" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            id="auth-password"
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-xl bg-lime-400 py-3.5 font-bold uppercase tracking-wide text-white hover:bg-lime-300 disabled:bg-zinc-700 disabled:text-zinc-500 btn-stamp"
                    >
                        {authLoading ? "Authenticating..." : isSignUp ? "Create Account" : "Log In"}
                    </button>
                </form>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800/80"></div>
                    <span className="flex-shrink mx-4 font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Or
                    </span>
                    <div className="flex-grow border-t border-zinc-800/80"></div>
                </div>

                {/* Guest Mode Button */}
                <button
                    onClick={() => {
                        loginAsGuest();
                        router.push("/dashboard");
                    }}
                    className="btn-stamp w-full rounded-xl bg-zinc-900 py-3.5 font-bold text-zinc-100"
                >
                    Try it as a guest
                </button>
            </div>
        </div>
    );
}
