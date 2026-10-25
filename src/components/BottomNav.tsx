"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, ClipboardList, Play, Library, User, Timer } from "lucide-react";
import { useWorkout } from "@/context/WorkoutContext";
import { useDatabase } from "@/context/DatabaseContext";

export default function BottomNav() {
    const pathname = usePathname();
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

    const tabs = [
        { href: "/dashboard", label: "Home", Icon: Dumbbell, active: pathname === "/dashboard" },
        { href: "/templates", label: "Templates", Icon: ClipboardList, active: pathname === "/templates" },
        { href: "/workout", label: "Start", Icon: Play, active: pathname === "/workout" },
        { href: "/exercises", label: "Exercises", Icon: Library, active: pathname === "/exercises" },
        { href: "/", label: "Account", Icon: User, active: pathname === "/" && !!user },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 select-none">
            {/* 1. Floating Rest Timer overlay (shows globally when rest is active) */}
            {restTimer.isActive && restTimer.timeLeft > 0 && pathname !== "/workout" && (
                <div className="rest-card mx-4 mb-3 flex items-center justify-between rounded-xl p-3">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full border-2 border-volt p-2 text-volt">
                            <Timer className="h-5 w-5 animate-spin" style={{ animationDuration: "6s" }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Rest</p>
                            <p className="font-display text-3xl leading-none text-volt">{formatDuration(restTimer.timeLeft)}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => adjustRestTimer(-15)}
                            className="min-h-11 rounded-lg bg-zinc-950 px-3 text-xs font-bold text-zinc-100 active:scale-95 transition-transform"
                        >
                            -15s
                        </button>
                        <button
                            onClick={() => adjustRestTimer(15)}
                            className="min-h-11 rounded-lg bg-zinc-950 px-3 text-xs font-bold text-zinc-100 active:scale-95 transition-transform"
                        >
                            +15s
                        </button>
                        <button
                            onClick={stopRestTimer}
                            className="min-h-11 rounded-lg bg-lime-400 px-3 text-xs font-bold text-white active:scale-95 transition-transform"
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
                    className="mx-4 mb-4 flex items-center justify-between rounded-xl p-3 slab slab-press"
                >
                    <div className="flex items-center space-x-3">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400 ring-2 ring-zinc-800"></span>
                        </div>
                        <div>
                            <p className="font-bold text-zinc-100 truncate">{activeWorkout.name}</p>
                            <p className="text-xs text-zinc-400">{formatDuration(workoutDuration)} elapsed</p>
                        </div>
                    </div>
                    <div className="btn-stamp flex shrink-0 items-center space-x-1.5 rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-bold uppercase text-white">
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>Resume</span>
                    </div>
                </Link>
            )}

            {/* 3. Primary Bottom Navigation Bar */}
            <nav className="border-t-[2.5px] border-zinc-800 bg-zinc-900 pb-safe" aria-label="Main">
                <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 text-zinc-500">
                    {tabs.map(({ href, label, Icon, active }) =>
                        href === "/workout" ? (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end pb-1.5"
                            >
                                <span
                                    className={`absolute -top-5 grid h-13 w-13 place-items-center rounded-full border-[2.5px] border-zinc-800 bg-lime-400 text-white transition-transform duration-150 group-active:translate-x-[3px] group-active:translate-y-[3px] group-active:shadow-none ${
                                        activeWorkout ? "animate-pulse-lime" : "shadow-[3px_3px_0_var(--ink)]"
                                    }`}
                                >
                                    <Play className="h-5 w-5 fill-white translate-x-px" />
                                </span>
                                <span
                                    className={`text-xs font-bold uppercase tracking-wide ${active ? "text-zinc-100" : ""}`}
                                >
                                    {activeWorkout ? "Active" : "Start"}
                                </span>
                            </Link>
                        ) : (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? "page" : undefined}
                                className={`group flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                                    active ? "text-zinc-100" : "hover:text-zinc-100"
                                }`}
                            >
                                <Icon className="h-5 w-5 transition-transform duration-150 group-active:scale-90" />
                                <span
                                    className={`rounded-[4px] px-1.5 text-xs font-bold uppercase tracking-wide transition-colors duration-150 ${
                                        active ? "tag-volt" : "border-2 border-transparent"
                                    }`}
                                >
                                    {label}
                                </span>
                            </Link>
                        ),
                    )}
                </div>
            </nav>

        </div>
    );
}
