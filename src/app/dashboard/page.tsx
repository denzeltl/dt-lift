"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDatabase, Workout } from "@/context/DatabaseContext";
import { Calendar, Trash2, Clock, Flame, Dumbbell, Award, ChevronDown, ChevronUp, BarChart2 } from "lucide-react";

export default function Dashboard() {
    const { user, workouts, deleteWorkout, isLoading } = useDatabase();
    const router = useRouter();
    const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});

    // Redirect to login if user not authenticated
    React.useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
                <Dumbbell className="h-10 w-10 animate-bounce text-lime-400" />
                <p className="text-sm font-semibold text-zinc-400">Loading Dashboard...</p>
            </div>
        );
    }

    // Calculate Metrics
    const totalWorkouts = workouts.length;

    const totalVolume = workouts.reduce((sum, w) => {
        const wVol =
            w.workout_sets?.reduce((setSum, s) => {
                return setSum + (s.completed ? Number(s.weight) * Number(s.reps) : 0);
            }, 0) || 0;
        return sum + wVol;
    }, 0);

    const avgDurationMins =
        workouts.length > 0
            ? Math.round(
                  workouts.reduce((sum, w) => {
                      if (!w.end_time) return sum;
                      const duration = (new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 1000 / 60;
                      return sum + duration;
                  }, 0) / workouts.length,
              )
            : 0;

    const calculateStreak = (workoutsList: Workout[]): number => {
        if (workoutsList.length === 0) return 0;
        const dates = workoutsList.map((w) => new Date(w.start_time).toDateString());
        const uniqueDates = Array.from(new Set(dates)).map((d) => new Date(d));

        uniqueDates.sort((a, b) => b.getTime() - a.getTime());

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const firstDate = uniqueDates[0];
        const checkDate = new Date(firstDate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate.getTime() !== today.getTime() && checkDate.getTime() !== yesterday.getTime()) {
            return 0;
        }

        let currentCheck = checkDate;
        streak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
            const nextDate = new Date(uniqueDates[i]);
            nextDate.setHours(0, 0, 0, 0);

            const expectedPrevDate = new Date(currentCheck);
            expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

            if (nextDate.getTime() === expectedPrevDate.getTime()) {
                streak++;
                currentCheck = nextDate;
            } else if (nextDate.getTime() === currentCheck.getTime()) {
                continue;
            } else {
                break;
            }
        }
        return streak;
    };

    const streak = calculateStreak(workouts);

    // Expand / collapse helper
    const toggleExpanded = (id: string) => {
        setExpandedWorkouts((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this workout log?")) {
            await deleteWorkout(id);
        }
    };

    // Format Helper
    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };

    const formatDuration = (start: string, end: string | null) => {
        if (!end) return "Active";
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const mins = Math.floor(diffSecs / 60);
        const hrs = Math.floor(mins / 60);

        if (hrs > 0) {
            return `${hrs}h ${mins % 60}m`;
        }
        return `${mins}m`;
    };

    // Render Custom SVG Volume Chart (Last 7 workouts)
    const renderVolumeChart = () => {
        const lastWorkouts = [...workouts].slice(0, 7).reverse();
        if (lastWorkouts.length < 2) {
            return (
                <div className="flex h-28 flex-col items-center justify-center rounded-xl bg-zinc-900/30 border border-zinc-800 text-center p-4">
                    <BarChart2 className="h-6 w-6 text-zinc-500 mb-1" />
                    <p className="text-xs text-zinc-500 font-medium">Log 2+ workouts to see volume charts</p>
                </div>
            );
        }

        const volumes = lastWorkouts.map(
            (w) =>
                w.workout_sets?.reduce((sum, s) => sum + (s.completed ? Number(s.weight) * Number(s.reps) : 0), 0) || 0,
        );

        const maxVolume = Math.max(...volumes, 1);
        const chartWidth = 320;
        const chartHeight = 120;
        const padding = 20;

        // Coordinates calculations
        const points = lastWorkouts.map((workout, index) => {
            const vol = volumes[index];
            const x = padding + (index * (chartWidth - padding * 2)) / (volumes.length - 1);
            // invert Y since SVG (0,0) is top-left
            const y = chartHeight - padding - (vol / maxVolume) * (chartHeight - padding * 2);
            const label = new Date(workout.end_time || workout.start_time).toLocaleDateString(undefined, {
                month: "2-digit",
                day: "numeric",
            });
            return { x, y, vol, label };
        });

        // Create Path String
        let pathD = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathD += ` L ${points[i].x} ${points[i].y}`;
        }

        // Create Closed Path String for Gradient Fill
        const fillD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

        return (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                    Volume Progression (Last 7 Sessions)
                </h4>
                <div className="relative w-full overflow-hidden flex justify-center">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a3e635" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#a3e635" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

                        {/* Gridlines */}
                        <line
                            x1={padding}
                            y1={padding}
                            x2={chartWidth - padding}
                            y2={padding}
                            stroke="#27272a"
                            strokeWidth="0.5"
                            strokeDasharray="3"
                        />
                        <line
                            x1={padding}
                            y1={chartHeight / 2}
                            x2={chartWidth - padding}
                            y2={chartHeight / 2}
                            stroke="#27272a"
                            strokeWidth="0.5"
                            strokeDasharray="3"
                        />
                        <line
                            x1={padding}
                            y1={chartHeight - padding}
                            x2={chartWidth - padding}
                            y2={chartHeight - padding}
                            stroke="#27272a"
                            strokeWidth="1"
                        />

                        {/* Gradient Area */}
                        <path d={fillD} fill="url(#chartGradient)" />

                        {/* Glow Path Line */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#a3e635"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Data Circles & Text */}
                        {points.map((pt, i) => (
                            <g key={i}>
                                <circle cx={pt.x} cy={pt.y} r="3.5" fill="#09090b" stroke="#a3e635" strokeWidth="2" />
                                <text
                                    x={pt.x}
                                    y={pt.y - 10}
                                    textAnchor="middle"
                                    fill="#f4f4f5"
                                    fontSize="10"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                >
                                    {pt.vol > 1000 ? `${(pt.vol / 1000).toFixed(1)}k` : Math.round(pt.vol)} kg
                                </text>
                                <text
                                    x={pt.x}
                                    y={chartHeight - 4}
                                    textAnchor="middle"
                                    fill="#71717a"
                                    fontSize="9"
                                    fontWeight="bold"
                                >
                                    {pt.label}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-black text-zinc-100 flex items-center space-x-2">
                    <Dumbbell className="h-6 w-6 text-lime-400" />
                    <span>CARRY LIFT</span>
                </h1>
                <p className="text-sm text-zinc-400 font-medium">Welcome back, your fitness metrics at a glance.</p>
            </div>

            {/* Grid of Key Analytics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-center space-x-3">
                    <div className="rounded-lg bg-lime-500/10 border border-lime-500/20 p-2 text-lime-400">
                        <Award className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Workouts</p>
                        <p className="text-lg font-black text-zinc-100">{totalWorkouts}</p>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-center space-x-3">
                    <div className="rounded-lg bg-lime-500/10 border border-lime-500/20 p-2 text-lime-400">
                        <Flame className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Day Streak</p>
                        <p className="text-lg font-black text-zinc-100">
                            {streak} {streak === 1 ? "day" : "days"}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-center space-x-3">
                    <div className="rounded-lg bg-lime-500/10 border border-lime-500/20 p-2 text-lime-400">
                        <Dumbbell className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Vol</p>
                        <p className="text-lg font-black text-zinc-100">{totalVolume.toLocaleString()} kg</p>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 flex items-center space-x-3">
                    <div className="rounded-lg bg-lime-500/10 border border-lime-500/20 p-2 text-lime-400">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Avg Time</p>
                        <p className="text-lg font-black text-zinc-100">{avgDurationMins} min</p>
                    </div>
                </div>
            </div>

            {/* SVG Chart */}
            {renderVolumeChart()}

            {/* Workout History */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="h-4 w-4 text-lime-400" />
                    <span>Workout History</span>
                </h3>

                {workouts.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-8 text-center text-zinc-500 space-y-3">
                        <Dumbbell className="h-8 w-8 text-zinc-700 mx-auto" />
                        <div>
                            <p className="font-semibold">No workouts logged yet</p>
                            <p className="text-sm text-zinc-500">Log your first workout to start tracking progress.</p>
                        </div>
                        <button
                            onClick={() => router.push("/workout")}
                            className="mx-auto rounded-lg bg-lime-400/10 border border-lime-500/20 px-4 py-2 text-sm font-bold text-lime-400 active:scale-95 transition-transform"
                        >
                            Start Workout Now
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workouts.map((w) => {
                            const isExpanded = !!expandedWorkouts[w.id];

                            // Count sets completed
                            const setsCount = w.workout_sets?.length || 0;

                            // Calculate specific workout volume
                            const workoutVolume =
                                w.workout_sets?.reduce(
                                    (sum, s) => sum + (s.completed ? Number(s.weight) * Number(s.reps) : 0),
                                    0,
                                ) || 0;

                            // Group sets by exercise
                            const exerciseMap: Record<
                                string,
                                { name: string; category: string; sets: typeof w.workout_sets }
                            > = {};
                            w.workout_sets?.forEach((s) => {
                                const exId = s.exercise_id;
                                const exName = s.exercise?.name || "Unknown Exercise";
                                const exCat = s.exercise?.category || "General";

                                if (!exerciseMap[exId]) {
                                    exerciseMap[exId] = { name: exName, category: exCat, sets: [] };
                                }
                                exerciseMap[exId].sets?.push(s);
                            });

                            return (
                                <div
                                    key={w.id}
                                    onClick={() => toggleExpanded(w.id)}
                                    className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden hover:bg-zinc-900/40 transition-colors cursor-pointer"
                                >
                                    {/* Top Bar Summary */}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-zinc-200">{w.name}</h4>
                                            <div className="flex items-center space-x-2 text-sm text-zinc-400">
                                                <span>{formatDate(w.start_time)}</span>
                                                <span>•</span>
                                                <span>{formatDuration(w.start_time, w.end_time)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <div className="text-right space-y-0.5">
                                                <p className="text-sm font-bold text-zinc-300">
                                                    {workoutVolume.toLocaleString()} kg
                                                </p>
                                                <p className="text-xs text-zinc-500 font-bold uppercase">
                                                    {setsCount} sets
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => handleDelete(w.id, e)}
                                                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 active:scale-95 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>

                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-zinc-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded exercise details */}
                                    {isExpanded && (
                                        <div className="border-t border-zinc-800/80 bg-zinc-950/40 p-4 space-y-4 animate-slide-up">
                                            {w.notes && (
                                                <div className="rounded-lg bg-zinc-900/50 p-2.5 text-xs text-zinc-400 border border-zinc-800/40 italic">
                                                    <span className="font-bold text-zinc-500 not-italic block uppercase text-xs">
                                                        Notes
                                                    </span>
                                                    &ldquo;{w.notes}&rdquo;
                                                </div>
                                            )}

                                            {Object.keys(exerciseMap).length === 0 ? (
                                                <p className="text-sm text-zinc-500">
                                                    No exercises logged in this session.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {Object.entries(exerciseMap).map(([exId, data]) => (
                                                        <div key={exId} className="space-y-1">
                                                            <h5 className="text-sm font-bold text-lime-400">
                                                                {data.name}
                                                            </h5>
                                                            <div className="grid grid-cols-1 gap-x-4 gap-y-1 pl-2">
                                                                {data.sets?.map((s, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="text-sm text-zinc-400 flex items-center justify-between py-0.5 border-b border-zinc-900/60"
                                                                    >
                                                                        <span className="text-zinc-500 font-bold text-xs uppercase">
                                                                            Set {idx + 1}
                                                                        </span>
                                                                        <span>
                                                                            {s.is_warmup && (
                                                                                <span className="text-xs text-amber-500 font-bold">
                                                                                    W
                                                                                </span>
                                                                            )}{" "}
                                                                            {s.weight} kg x {s.reps}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
