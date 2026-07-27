"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatabase } from "@/context/DatabaseContext";
import { Dumbbell, LogOut, CheckCircle2, Cloud, HardDrive, Smartphone } from "lucide-react";

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
            window.deferredPrompt = null;
            setInstallable(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
                <Dumbbell className="h-10 w-10 animate-bounce text-lime-400" />
                <p className="text-sm font-semibold text-zinc-400">Loading DT Lift...</p>
            </div>
        );
    }

    // LOGGED IN: Profile View
    if (user) {
        return (
            <div className="space-y-6 pt-4">
                {/* Profile Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur">
                    <div className="flex items-center space-x-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lime-400 text-black font-extrabold text-2xl uppercase shadow-md shadow-lime-400/10">
                            {user.full_name ? user.full_name.substring(0, 2) : user.email.substring(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-100">{user.full_name || "DT Lift User"}</h2>
                            <p className="text-sm text-zinc-400">{user.email}</p>
                        </div>
                    </div>
                </div>

                {/* Database Connection Status Card */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Sync Status</h3>
                    <div className="flex items-start space-x-3">
                        {isLocalOnly ? (
                            <>
                                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-400 mt-0.5">
                                    <HardDrive className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-200">Guest Mode (Local Storage Only)</h4>
                                    <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                                        Your workout templates and history are stored locally in your browser cache.
                                    </p>
                                    <p className="text-xs text-amber-400 leading-relaxed mt-2 italic font-medium">
                                        To sync across devices and back up data in the cloud, log in or sign up for an
                                        account.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="rounded-lg bg-lime-500/10 border border-lime-500/20 p-2.5 text-lime-400 mt-0.5">
                                    <Cloud className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-zinc-200">Cloud Connected</h4>
                                    <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                                        Your account is synced securely with the database. Workouts are saved in
                                        real-time.
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
                        className="flex w-full items-center justify-between rounded-2xl border border-lime-500/30 bg-lime-500/10 p-5 text-left text-zinc-100 hover:bg-lime-500/15 active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="rounded-xl bg-lime-400 p-2.5 text-black">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-zinc-100">Install DT Lift App</h4>
                                <p className="text-sm text-lime-300/80">
                                    Add to your Home Screen for a native experience
                                </p>
                            </div>
                        </div>
                        <div className="rounded-full bg-zinc-800 p-1 px-3 text-sm font-bold text-lime-400">Install</div>
                    </button>
                )}

                {/* Info & Credits */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 text-center text-xs text-zinc-500 space-y-1">
                    <p className="font-semibold text-zinc-400">DT Lift v1.0.0</p>
                    <p>Created with Next.js, Tailwind v4 and Supabase</p>
                    <p className="text-zinc-600">All rights reserved &copy; 2026</p>
                </div>

                {/* Log Out Button */}
                <button
                    onClick={logout}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl border border-red-500/30 bg-red-950/20 py-3.5 text-sm font-bold text-red-400 hover:bg-red-950/30 active:scale-[0.98] transition-all"
                >
                    <LogOut className="h-4.5 w-4.5" />
                    <span>Log Out Account</span>
                </button>
            </div>
        );
    }

    // NOT LOGGED IN: Auth Form
    return (
        <div className="flex min-h-[75vh] flex-col justify-center py-6">
            {/* Brand Header */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 mb-8 animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400 p-3 shadow-lg shadow-lime-500/20">
                    <Dumbbell className="h-10 w-10 text-black transform" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">
                        DT <span className="text-lime-400">LIFT</span>
                    </h1>
                    <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase mt-1">Gym tracker</p>
                </div>
            </div>

            {/* Auth Card */}
            <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-6">
                {/* Toggle LogIn/SignUp tabs */}
                <div className="grid grid-cols-2 rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                    <button
                        onClick={() => {
                            setIsSignUp(false);
                            setAuthError("");
                        }}
                        className={`rounded-md py-2 text-xs font-bold transition-all ${
                            !isSignUp ? "bg-zinc-800 text-lime-400" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => {
                            setIsSignUp(true);
                            setAuthError("");
                        }}
                        className={`rounded-md py-2 text-xs font-bold transition-all ${
                            isSignUp ? "bg-zinc-800 text-lime-400" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        Sign Up
                    </button>
                </div>

                {authError && (
                    <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-3 text-center text-xs font-semibold text-red-400">
                        {authError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Juan Dela Cruz"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-xl bg-lime-400 py-3.5 text-sm font-extrabold text-black shadow-md hover:bg-lime-300 disabled:bg-zinc-700 disabled:text-zinc-500 active:scale-[0.98] transition-all"
                    >
                        {authLoading ? "Authenticating..." : isSignUp ? "Create Account" : "Log In"}
                    </button>
                </form>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800/80"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 py-3.5 text-sm font-bold text-zinc-300 hover:bg-zinc-900/50 active:scale-[0.98] transition-all"
                >
                    Try as Guest (Local Storage)
                </button>
            </div>
        </div>
    );
}
