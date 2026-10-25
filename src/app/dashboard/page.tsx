"use client";

import React, { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useDatabase, Workout } from "@/context/DatabaseContext";
import Logo from "@/components/Logo";
import { Trash2, Dumbbell, ChevronDown, ChevronUp, BarChart2, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";

// Weekly goal lives in localStorage; read it as an external store so SSR renders the default (3).
const GOAL_KEY = "dt_lift_weekly_goal";
const GOAL_EVENT = "dt-lift-weekly-goal";
const readWeeklyGoal = () => {
    const parsed = parseInt(localStorage.getItem(GOAL_KEY) ?? "", 10);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 7 ? parsed : 3;
};
const subscribeWeeklyGoal = (onChange: () => void) => {
    window.addEventListener(GOAL_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(GOAL_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
};

export default function Dashboard() {
    const { user, workouts, deleteWorkout, isLoading } = useDatabase();
    const router = useRouter();
    const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});
    const weeklyGoal = useSyncExternalStore(subscribeWeeklyGoal, readWeeklyGoal, () => 3);

    const updateWeeklyGoal = (delta: number) => {
        const next = Math.max(1, Math.min(7, weeklyGoal + delta));
        localStorage.setItem(GOAL_KEY, String(next));
        window.dispatchEvent(new Event(GOAL_EVENT));
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
                <div className="flex h-28 flex-col items-center justify-center rounded-xl bg-zinc-900/30 border border-zinc-800 text-center p-4 slab">
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
            <div className="rounded-xl p-4 slab">
                <h2 className="text-xl text-zinc-100">Volume trend</h2>
                <p className="mb-3 text-sm text-zinc-500">Total kg lifted, last 7 sessions</p>
                <div className="relative w-full overflow-hidden flex justify-center">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C93519" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#C93519" stopOpacity="0.04" />
                            </linearGradient>
                        </defs>

                        {/* Gridlines */}
                        <line
                            x1={padding}
                            y1={padding}
                            x2={chartWidth - padding}
                            y2={padding}
                            stroke="#15111F"
                            strokeOpacity="0.25"
                            strokeWidth="0.75"
                            strokeDasharray="3"
                        />
                        <line
                            x1={padding}
                            y1={chartHeight / 2}
                            x2={chartWidth - padding}
                            y2={chartHeight / 2}
                            stroke="#15111F"
                            strokeOpacity="0.25"
                            strokeWidth="0.75"
                            strokeDasharray="3"
                        />
                        <line
                            x1={padding}
                            y1={chartHeight - padding}
                            x2={chartWidth - padding}
                            y2={chartHeight - padding}
                            stroke="#15111F"
                            strokeWidth="2"
                        />

                        {/* Gradient Area */}
                        <path d={fillD} fill="url(#chartGradient)" />

                        {/* Glow Path Line */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke="#15111F"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Data Circles & Text */}
                        {points.map((pt, i) => (
                            <g key={i}>
                                <circle cx={pt.x} cy={pt.y} r="4.5" fill="#C93519" stroke="#15111F" strokeWidth="2.5" />
                                <text
                                    x={pt.x}
                                    y={pt.y - 10}
                                    textAnchor="middle"
                                    fill="#15111F"
                                    fontSize="10"
                                    fontWeight="600"
                                    fontFamily="var(--font-plex-mono), monospace"
                                >
                                    {pt.vol > 1000 ? `${(pt.vol / 1000).toFixed(1)}k` : Math.round(pt.vol)} kg
                                </text>
                                <text
                                    x={pt.x}
                                    y={chartHeight - 4}
                                    textAnchor="middle"
                                    fill="#6B6458"
                                    fontSize="9"
                                    fontWeight="600"
                                    fontFamily="var(--font-plex-mono), monospace"
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
                <div className="flex items-center gap-3">
                    <Logo className="h-12 w-12 shrink-0" />
                    <div className="min-w-0">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        </p>
                        <h1 className="text-4xl text-zinc-100">DT Lift</h1>
                    </div>
                </div>
            </div>

            {/* Grid of Key Analytics */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3.5 slab">
                                        <div>
                        <p className="font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Workouts</p>
                        <p className="font-display mt-1.5 text-3xl text-zinc-100">{totalWorkouts}</p>
                    </div>
                </div>

                <div className="rounded-xl p-3.5 slab">
                                        <div>
                        <p className="font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Week Streak</p>
                        <p className="font-display mt-1.5 text-3xl text-zinc-100">
                            {weekStreak}
                            <span className="ml-1 font-mono text-xs">{weekStreak === 1 ? "wk" : "wks"}</span>
                        </p>
                    </div>
                </div>

                <div className="rounded-xl p-3.5 slab">
                                        <div>
                        <p className="font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Vol</p>
                        <p className="font-display mt-1.5 text-3xl text-zinc-100 break-all">
                            {Math.round(totalVolume).toLocaleString()}
                            <span className="ml-1 font-mono text-xs">kg</span>
                        </p>
                    </div>
                </div>

                <div className="rounded-xl p-3.5 slab">
                                        <div>
                        <p className="font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Avg Time</p>
                        <p className="font-display mt-1.5 text-3xl text-zinc-100">
                            {avgDurationMins}
                            <span className="ml-1 font-mono text-xs">min</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Weekly Calendar & Goal Card */}
            <div className="rounded-xl p-4 space-y-4 slab">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <h2 className="text-xl text-zinc-100 whitespace-nowrap">This week</h2>
                        {thisWeekCount >= weeklyGoal && (
                            <span className="tag-volt whitespace-nowrap rounded-[4px] px-1.5 font-mono text-[11px] font-semibold uppercase -rotate-3">
                                Goal hit
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => updateWeeklyGoal(-1)}
                            aria-label="Lower weekly goal"
                            className="grid h-9 w-9 place-items-center rounded-md border-2 border-zinc-800 bg-zinc-900 text-zinc-100 active:scale-90 transition-transform disabled:opacity-30"
                            disabled={weeklyGoal <= 1}
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono text-xs font-semibold text-zinc-100 whitespace-nowrap px-1 text-center">
                            {weeklyGoal}x / wk
                        </span>
                        <button
                            onClick={() => updateWeeklyGoal(1)}
                            aria-label="Raise weekly goal"
                            className="grid h-9 w-9 place-items-center rounded-md border-2 border-zinc-800 bg-zinc-900 text-zinc-100 active:scale-90 transition-transform disabled:opacity-30"
                            disabled={weeklyGoal >= 7}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Week Calendar Row (Monday - Sunday) */}
                <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-2">
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
                                aria-pressed={!!isSelected}
                                className={`flex flex-col items-center flex-1 py-1.5 rounded-lg transition-colors ${isSelected ? "bg-zinc-850" : ""}`}
                            >
                                <span className={`font-mono text-[10px] font-semibold uppercase ${
                                    isToday ? "text-lime-400" : "text-zinc-500"
                                }`}>
                                    {day.toLocaleDateString("en-US", { weekday: "short" }).substring(0, 3)}
                                </span>
                                <div className={`mt-1.5 flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                                    isWorkoutDay
                                        ? "bg-volt text-zinc-100 border-2 border-zinc-800 font-black"
                                        : isToday
                                            ? "border-2 border-lime-400 text-lime-400 font-extrabold"
                                            : isSelected
                                                ? "border-2 border-zinc-800 text-zinc-100"
                                                : "text-zinc-400"
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
                    <p className="text-sm font-semibold text-zinc-500">
                        <span className="font-display text-xl text-zinc-100">{thisWeekCount}</span>
                        <span> of {weeklyGoal} workouts</span>
                    </p>
                    <button
                        onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                        className="flex min-h-9 items-center space-x-1 rounded-md border-2 border-zinc-800 bg-zinc-900 px-2.5 font-bold text-zinc-100 transition-transform active:scale-95"
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
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 transition-colors"
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
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 transition-colors"
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
                                        className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all hover:bg-zinc-850/40 ${
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
                                            <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-lime-400" />
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-lg border-2 border-zinc-800 pointer-events-none" />
                                        )}
                                        {isToday && !isSelected && (
                                            <div className="absolute inset-0 rounded-lg border-2 border-lime-400 pointer-events-none" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Inspect Selected Date Details */}
                {selectedDate && (
                    <div className="rounded-xl bg-zinc-950 p-3 space-y-2 animate-slide-up">
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
                                        className="flex items-center justify-between bg-zinc-900 border-2 border-zinc-800 p-2.5 rounded-lg cursor-pointer transition-transform active:scale-[0.98]"
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
                <h2 className="text-2xl text-zinc-100">History</h2>

                {workouts.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-8 text-center text-zinc-500 space-y-3 slab">
                        <Dumbbell className="h-8 w-8 text-zinc-700 mx-auto" />
                        <div>
                            <p className="font-semibold">No workouts logged yet</p>
                            <p className="text-sm text-zinc-500">Log your first workout to start tracking progress.</p>
                        </div>
                        <button
                            onClick={() => router.push("/workout")}
                            className="btn-stamp mx-auto rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-bold text-white"
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
                                    className="rounded-xl overflow-hidden cursor-pointer slab slab-press"
                                >
                                    {/* Top Bar Summary */}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="min-w-0 space-y-1">
                                            <h3 className="font-bold text-zinc-100 truncate">{w.name}</h3>
                                            <div className="flex items-center space-x-2 text-sm text-zinc-500">
                                                <span>{formatDate(w.start_time)}</span>
                                                <span>•</span>
                                                <span>{formatDuration(w.start_time, w.end_time)}</span>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center space-x-2">
                                            <div className="text-right space-y-0.5">
                                                <p className="font-mono text-sm font-semibold text-zinc-100">
                                                    {workoutVolume.toLocaleString()} kg
                                                </p>
                                                <p className="font-mono text-[11px] text-zinc-500 font-semibold uppercase">
                                                    {setsCount} sets
                                                </p>
                                            </div>

                                            <button
                                                onClick={(e) => handleDelete(w.id, e)}
                                                aria-label={`Delete ${w.name}`}
                                                className="grid h-10 w-10 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-850 hover:text-red-400 active:scale-90 transition-transform"
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
                                        <div className="border-t-2 border-zinc-800 bg-zinc-950 p-4 space-y-4">
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
                                                            <h4 className="font-display text-lg text-zinc-100">
                                                                {data.name}
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-x-4 gap-y-1 pl-2">
                                                                {data.sets?.map((s, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="font-mono text-sm text-zinc-300 flex items-center justify-between py-1 border-b border-zinc-800/15"
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
                                                                            {s.weight} kg × {s.reps}
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
