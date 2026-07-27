"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatabase, Workout } from "@/context/DatabaseContext";
import { Calendar, Trash2, Clock, Flame, Dumbbell, Award, ChevronDown, ChevronUp, BarChart2, Minus, Plus, Target, ChevronLeft, ChevronRight } from "lucide-react";

export default function Dashboard() {
    const { user, workouts, deleteWorkout, isLoading } = useDatabase();
    const router = useRouter();
    const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});
    const [weeklyGoal, setWeeklyGoal] = useState(3);

    // Load persisted weekly goal from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("dt_lift_weekly_goal");
        if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 7) setWeeklyGoal(parsed);
        }
    }, []);

    const updateWeeklyGoal = (delta: number) => {
        setWeeklyGoal((prev) => {
            const next = Math.max(1, Math.min(7, prev + delta));
            localStorage.setItem("dt_lift_weekly_goal", String(next));
            return next;
        });
    };
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Helpers for mapping dates to workouts
    const hasWorkoutOnDate = (date: Date): boolean => {
        const dateStr = date.toDateString();
        return workouts.some((w) => new Date(w.start_time).toDateString() === dateStr);
    };

    const getWorkoutsOnDate = (date: Date): Workout[] => {
        const dateStr = date.toDateString();
        return workouts.filter((w) => new Date(w.start_time).toDateString() === dateStr);
    };

    const getDaysOfCurrentWeek = (): Date[] => {
        const today = new Date();
        const startOfWeek = getWeekStart(today);
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const getDaysOfCalendarMonth = (date: Date): Date[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const startOfGrid = new Date(firstDay);
        const dayOfWeek = startOfGrid.getDay(); // 0=Sun, 1=Mon...
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // shift Monday = 0
        startOfGrid.setDate(startOfGrid.getDate() - diff);

        const gridDays: Date[] = [];
        const temp = new Date(startOfGrid);
        for (let i = 0; i < 42; i++) {
            gridDays.push(new Date(temp));
            temp.setDate(temp.getDate() + 1);
        }
        return gridDays;
    };

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

    // Helper: get the Monday (start) of a week for a given date
    const getWeekStart = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay(); // 0=Sun, 1=Mon, ...
        const diff = day === 0 ? 6 : day - 1; // shift so Monday = 0
        d.setDate(d.getDate() - diff);
        return d;
    };

    // Count workouts in the current (ISO) week
    const getThisWeekCount = (workoutsList: Workout[]): number => {
        const weekStart = getWeekStart(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const uniqueDays = new Set<string>();
        workoutsList.forEach((w) => {
            const d = new Date(w.start_time);
            if (d >= weekStart && d < weekEnd) {
                uniqueDays.add(d.toDateString());
            }
        });
        return uniqueDays.size;
    };

    // Calculate consecutive-week streak where goal was met
    const calculateWeekStreak = (workoutsList: Workout[], goal: number): number => {
        if (workoutsList.length === 0) return 0;

        // Bucket workouts into weeks (by week-start date key)
        const weekBuckets = new Map<string, Set<string>>();
        workoutsList.forEach((w) => {
            const d = new Date(w.start_time);
            const ws = getWeekStart(d);
            const key = ws.toISOString();
            if (!weekBuckets.has(key)) weekBuckets.set(key, new Set());
            weekBuckets.get(key)!.add(d.toDateString());
        });

        // Sort week keys newest-first
        const sortedWeeks = Array.from(weekBuckets.keys()).sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime(),
        );

        const now = new Date();
        const currentWeekKey = getWeekStart(now).toISOString();
        const lastWeekDate = new Date(getWeekStart(now));
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeekKey = lastWeekDate.toISOString();

        let streak = 0;
        let startIdx = 0;

        // The newest week must be either the current or last week
        if (sortedWeeks.length === 0) return 0;
        const newestKey = sortedWeeks[0];

        if (newestKey === currentWeekKey) {
            // Current week is in progress — count it toward streak only if goal already met
            const currentCount = weekBuckets.get(currentWeekKey)?.size || 0;
            if (currentCount >= goal) {
                streak = 1;
                startIdx = 1;
            } else {
                // Skip current week (still in progress), start checking from last week
                startIdx = sortedWeeks[1] === lastWeekKey ? 1 : -1;
                if (startIdx === -1) return 0;
            }
        } else if (newestKey === lastWeekKey) {
            startIdx = 0;
        } else {
            // Most recent workout week is older than last week — streak is 0
            return 0;
        }

        // Walk backwards through consecutive weeks
        let expectedWeek = new Date(sortedWeeks[startIdx]);
        for (let i = startIdx; i < sortedWeeks.length; i++) {
            const weekKey = sortedWeeks[i];
            const weekDate = new Date(weekKey);

            if (weekDate.getTime() !== expectedWeek.getTime()) break;

            const dayCount = weekBuckets.get(weekKey)?.size || 0;
            if (dayCount >= goal) {
                streak++;
                expectedWeek = new Date(expectedWeek);
                expectedWeek.setDate(expectedWeek.getDate() - 7);
            } else {
                break;
            }
        }

        return streak;
    };

    const weekStreak = calculateWeekStreak(workouts, weeklyGoal);
    const thisWeekCount = getThisWeekCount(workouts);

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
                    <span>DT LIFT</span>
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
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Week Streak</p>
                        <p className="text-lg font-black text-zinc-100">
                            {weekStreak} {weekStreak === 1 ? "wk" : "wks"}
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

            {/* Weekly Calendar & Goal Card */}
            <div className={`rounded-xl border p-4 space-y-4 transition-all duration-300 ${
                thisWeekCount >= weeklyGoal
                    ? "border-lime-500/40 bg-lime-500/5"
                    : "border-zinc-800 bg-zinc-900/30"
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Calendar className={`h-4.5 w-4.5 ${thisWeekCount >= weeklyGoal ? "text-lime-400" : "text-zinc-400"}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                            Workout Calendar
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => updateWeeklyGoal(-1)}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:scale-90 transition-all disabled:opacity-30"
                            disabled={weeklyGoal <= 1}
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-zinc-400 tabular-nums w-14 text-center">
                            Goal: {weeklyGoal}x
                        </span>
                        <button
                            onClick={() => updateWeeklyGoal(1)}
                            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:scale-90 transition-all disabled:opacity-30"
                            disabled={weeklyGoal >= 7}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Week Calendar Row (Monday - Sunday) */}
                <div className="flex items-center justify-between bg-zinc-950/40 rounded-xl p-3 border border-zinc-800/40">
                    {getDaysOfCurrentWeek().map((day) => {
                        const isWorkoutDay = hasWorkoutOnDate(day);
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                        
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedDate(null);
                                    } else {
                                        setSelectedDate(day);
                                    }
                                }}
                                className="flex flex-col items-center flex-1 py-1 rounded-lg hover:bg-zinc-800/30 transition-colors focus:outline-none"
                            >
                                <span className={`text-[9px] font-extrabold uppercase ${
                                    isToday ? "text-lime-400 font-black" : "text-zinc-500"
                                }`}>
                                    {day.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 3)}
                                </span>
                                <div className={`mt-1.5 flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                                    isWorkoutDay
                                        ? "bg-lime-400 text-zinc-950 shadow-[0_0_10px_rgba(163,230,53,0.3)] font-black"
                                        : isToday
                                            ? "border border-lime-400 text-lime-400 font-extrabold"
                                            : isSelected
                                                ? "border border-zinc-500 text-zinc-300"
                                                : "text-zinc-400 bg-zinc-900/40"
                                }`}>
                                    {isWorkoutDay ? (
                                        <Dumbbell className="h-3.5 w-3.5" />
                                    ) : (
                                        day.getDate()
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Progress summary & Expand button */}
                <div className="flex items-center justify-between text-xs">
                    <p className="font-bold text-zinc-400">
                        This week: <span className={thisWeekCount >= weeklyGoal ? "text-lime-400 font-extrabold" : "text-zinc-200"}>{thisWeekCount}</span>
                        <span className="text-zinc-500"> / {weeklyGoal} workouts</span>
                    </p>
                    <button
                        onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                        className="flex items-center space-x-1 font-bold text-lime-400 hover:text-lime-300 transition-colors bg-lime-400/5 px-2.5 py-1 rounded-md border border-lime-500/10 active:scale-95"
                    >
                        <span>{isCalendarExpanded ? "Hide Month" : "Show Month"}</span>
                        {isCalendarExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                </div>

                {/* Expanded Month View */}
                {isCalendarExpanded && (
                    <div className="border-t border-zinc-800/80 pt-4 space-y-3 animate-slide-up">
                        {/* Month Header Navigation */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => {
                                    const prev = new Date(calendarMonth);
                                    prev.setMonth(prev.getMonth() - 1);
                                    setCalendarMonth(prev);
                                }}
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                                {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </span>
                            <button
                                onClick={() => {
                                    const next = new Date(calendarMonth);
                                    next.setMonth(next.getMonth() + 1);
                                    setCalendarMonth(next);
                                }}
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Month Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {/* Grid Headers */}
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => (
                                <span key={h} className="text-[9px] font-extrabold text-zinc-500 uppercase py-1">
                                    {h.substring(0, 1)}
                                </span>
                            ))}
                            
                            {/* Grid Days */}
                            {getDaysOfCalendarMonth(calendarMonth).map((day) => {
                                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                                const isWorkoutDay = hasWorkoutOnDate(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedDate(null);
                                            } else {
                                                setSelectedDate(day);
                                            }
                                        }}
                                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all hover:bg-zinc-800/40 ${
                                            isCurrentMonth ? "" : "opacity-35"
                                        }`}
                                    >
                                        <span className={`font-semibold ${
                                            isToday 
                                                ? "text-lime-400 font-extrabold" 
                                                : isWorkoutDay 
                                                    ? "text-zinc-200" 
                                                    : "text-zinc-400"
                                        }`}>
                                            {day.getDate()}
                                        </span>
                                        {/* Under-date indicator */}
                                        {isWorkoutDay && (
                                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-lime-400 shadow-[0_0_4px_rgba(163,230,53,0.6)]" />
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-lg border border-zinc-500 pointer-events-none" />
                                        )}
                                        {isToday && !isSelected && (
                                            <div className="absolute inset-0 rounded-lg border border-lime-500/30 pointer-events-none" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Inspect Selected Date Details */}
                {selectedDate && (
                    <div className="border-t border-zinc-800/80 pt-3 bg-zinc-950/30 rounded-xl p-3 border border-zinc-800/20 space-y-2 animate-slide-up">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-400">
                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </span>
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="text-zinc-500 hover:text-zinc-300 font-bold"
                            >
                                Clear
                            </button>
                        </div>
                        
                        {getWorkoutsOnDate(selectedDate).length === 0 ? (
                            <p className="text-xs text-zinc-500 italic">No workouts logged on this day.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {getWorkoutsOnDate(selectedDate).map((w) => (
                                    <div
                                        key={w.id}
                                        onClick={() => {
                                            toggleExpanded(w.id);
                                            document.getElementById(`workout-${w.id}`)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="flex items-center justify-between bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 p-2 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Dumbbell className="h-3.5 w-3.5 text-lime-400" />
                                            <span className="text-xs font-bold text-zinc-200">{w.name}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                            {w.workout_sets?.length || 0} sets
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
                                    id={`workout-${w.id}`}
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
