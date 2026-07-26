"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dumbbell, ClipboardList, Play, Library, User, Timer } from "lucide-react";
import { useWorkout } from "@/context/WorkoutContext";
import { useDatabase } from "@/context/DatabaseContext";

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useDatabase();
    const { activeWorkout, workoutDuration, restTimer, adjustRestTimer, stopRestTimer } = useWorkout();

    // Do not show bottom nav on the landing page if user is not logged in
    if (!user && pathname === "/") return null;

    // Format duration helpers (seconds -> hh:mm:ss or mm:ss)
    const formatDuration = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 select-none">
            {/* 1. Floating Rest Timer overlay (shows globally when rest is active) */}
            {restTimer.isActive && restTimer.timeLeft > 0 && pathname !== "/workout" && (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-lime-500/30 bg-zinc-900/95 p-3 shadow-lg shadow-lime-500/5 backdrop-blur-md animate-pulse-lime">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-lime-500/20 p-2 text-lime-400">
                            <Timer className="h-5 w-5 animate-spin" style={{ animationDuration: "6s" }} />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Rest Timer</p>
                            <p className="text-lg font-bold text-lime-400">{formatDuration(restTimer.timeLeft)}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => adjustRestTimer(-15)}
                            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95 transition-transform"
                        >
                            -15s
                        </button>
                        <button
                            onClick={() => adjustRestTimer(15)}
                            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95 transition-transform"
                        >
                            +15s
                        </button>
                        <button
                            onClick={stopRestTimer}
                            className="rounded-lg bg-red-950/80 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 active:scale-95 transition-transform"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Floating Active Workout Bar */}
            {activeWorkout && pathname !== "/workout" && (
                <Link
                    href="/workout"
                    className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 shadow-lg hover:bg-zinc-900 transition-colors backdrop-blur-md"
                >
                    <div className="flex items-center space-x-3">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-zinc-100">{activeWorkout.name}</p>
                            <p className="text-xs text-zinc-400">{formatDuration(workoutDuration)} elapsed</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg bg-lime-500/10 border border-lime-500/20 px-3 py-1.5 text-xs font-semibold text-lime-400">
                        <Play className="h-3.5 w-3.5 fill-lime-400" />
                        <span>Resume</span>
                    </div>
                </Link>
            )}

            {/* 3. Primary Bottom Navigation Bar */}
            <nav className="border-t border-zinc-900 bg-zinc-950/95 pb-safe backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 text-zinc-500">
                    <Link
                        href="/dashboard"
                        className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                            pathname === "/dashboard" ? "text-lime-400" : "hover:text-zinc-300"
                        }`}
                    >
                        <Dumbbell className="h-5.5 w-5.5" />
                        <span className="mt-1 text-xs font-medium">Home</span>
                    </Link>

                    <Link
                        href="/templates"
                        className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                            pathname === "/templates" ? "text-lime-400" : "hover:text-zinc-300"
                        }`}
                    >
                        <ClipboardList className="h-5.5 w-5.5" />
                        <span className="mt-1 text-xs font-medium">Templates</span>
                    </Link>

                    {/* Active / Quick Workout tab */}
                    <Link
                        href="/workout"
                        className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors -mt-2.5 ${
                            pathname === "/workout" ? "text-lime-400" : "hover:text-zinc-300"
                        }`}
                    >
                        <div
                            className={`rounded-full p-2.5 -translate-y-3 shadow-lg border transition-all ${
                                activeWorkout
                                    ? "bg-lime-500 border-lime-400 text-black shadow-lime-500/20 animate-pulse-lime"
                                    : pathname === "/workout"
                                      ? "bg-zinc-800 border-lime-500/30 text-lime-400"
                                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            <Play className={`h-5 w-5 ${activeWorkout ? "fill-black" : ""}`} />
                        </div>
                        <span className="absolute bottom-1.5 text-xs font-medium">
                            {activeWorkout ? "Active" : "Start"}
                        </span>
                    </Link>

                    <Link
                        href="/exercises"
                        className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                            pathname === "/exercises" ? "text-lime-400" : "hover:text-zinc-300"
                        }`}
                    >
                        <Library className="h-5.5 w-5.5" />
                        <span className="mt-1 text-xs font-medium">Exercises</span>
                    </Link>

                    <Link
                        href="/"
                        className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                            pathname === "/" && user ? "text-lime-400" : "hover:text-zinc-300"
                        }`}
                    >
                        <User className="h-5.5 w-5.5" />
                        <span className="mt-1 text-xs font-medium">Account</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
