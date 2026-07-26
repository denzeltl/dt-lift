"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDatabase } from "@/context/DatabaseContext";
import { useWorkout, LogSet } from "@/context/WorkoutContext";
import {
    Play,
    Plus,
    Trash2,
    X,
    Search,
    Check,
    Clock,
    AlertTriangle,
    MessageSquare,
    Timer,
    RefreshCw,
    FileText,
    Trophy,
    Pencil,
} from "lucide-react";

export default function Workout() {
    const { user, templates, exercises, personalRecords, updateExerciseNotes, isLoading } = useDatabase();
    const {
        activeWorkout,
        workoutDuration,
        restTimer,
        startWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        addSetToExercise,
        removeSetFromExercise,
        updateSet,
        toggleSetCompleted,
        cancelWorkout,
        finishWorkout,
        swapExerciseInWorkout,
        stopRestTimer,
        adjustRestTimer,
    } = useWorkout();

    const router = useRouter();

    // State variables
    const [showAddExPicker, setShowAddExPicker] = useState(false);
    const [substitutePickerExIndex, setSubstitutePickerExIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Exercise notes state during workout
    const [openNotesExId, setOpenNotesExId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState<string>("");

    // Weight unit state for active workout
    const [activeWeightUnit, setActiveWeightUnit] = useState<"kg" | "lbs">("kg");

    // Local drafts for weight inputs to allow typing in displayed unit
    const [weightInputDrafts, setWeightInputDrafts] = useState<Record<string, string>>({});

    // Finish workout modal
    const [showFinishModal, setShowFinishModal] = useState(false);
    const [sessionNotes, setSessionNotes] = useState("");

    // Local display name to avoid directly mutating hook return value
    const [localWorkoutName, setLocalWorkoutName] = useState<string>(activeWorkout?.name || "");

    useEffect(() => {
        // Defer setting local state to avoid synchronous setState within an effect
        if (!activeWorkout) return;
        const id = window.setTimeout(() => setLocalWorkoutName(activeWorkout.name), 0);
        return () => clearTimeout(id);
    }, [activeWorkout]);

    // Redirect to login if user not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
                <Clock className="h-10 w-10 animate-bounce text-lime-400" />
                <p className="text-sm font-semibold text-zinc-400">Loading Workout...</p>
            </div>
        );
    }

    // Format Duration Clock
    const formatDuration = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Weight conversion helpers
    const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
    const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;

    const getWeightInputValue = (exIdx: number, setIdx: number, set: LogSet) => {
        const key = `${exIdx}-${setIdx}`;
        if (weightInputDrafts[key] !== undefined) {
            return weightInputDrafts[key];
        }

        if (activeWeightUnit === "lbs") {
            const kgNum = parseFloat(set.weight) || 0;
            return set.weight ? kgToLbs(kgNum).toString() : "";
        }

        return set.weight.toString() || "";
    };

    const handleWeightInputChange = (exIdx: number, setIdx: number, value: string) => {
        const key = `${exIdx}-${setIdx}`;
        setWeightInputDrafts((prev) => ({ ...prev, [key]: value }));

        if (!value) {
            updateSet(exIdx, setIdx, { weight: "" });
            return;
        }

        const parsedValue = parseFloat(value) || 0;
        const storedKg = activeWeightUnit === "lbs" ? lbsToKg(parsedValue) : parsedValue;
        updateSet(exIdx, setIdx, { weight: storedKg.toString() });
    };

    // Categories for Exercise Selector
    const categories = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

    // Filter exercises
    const filteredExercises = exercises.filter((ex) => {
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === "All" || ex.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    // Start Quick Workout
    const handleStartEmpty = () => {
        startWorkout();
    };

    const handleFinishSubmit = async () => {
        await finishWorkout(sessionNotes);
        setShowFinishModal(false);
        setSessionNotes("");
        router.push("/dashboard");
    };

    const handleCancelClick = () => {
        if (confirm("Cancel this workout? Your current progress in this session will be discarded.")) {
            cancelWorkout();
        }
    };

    const handleSelectExerciseFromPicker = (exId: string) => {
        if (substitutePickerExIndex !== null) {
            swapExerciseInWorkout(substitutePickerExIndex, exId);
            setSubstitutePickerExIndex(null);
        } else {
            addExerciseToWorkout(exId);
        }
        setShowAddExPicker(false);
        setSearchQuery("");
    };

    // CASE 1: NO ACTIVE WORKOUT
    if (!activeWorkout) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-zinc-100 flex items-center space-x-2">
                        <Play className="h-6 w-6 text-lime-400" />
                        <span>Start Workout</span>
                    </h1>
                    <p className="text-sm text-zinc-400 font-medium">
                        Log a blank session or load from a routine template.
                    </p>
                </div>

                {/* Start Empty */}
                <button
                    onClick={handleStartEmpty}
                    className="w-full flex flex-col items-center justify-center rounded-2xl border border-lime-500/20 bg-lime-500/5 hover:bg-lime-500/10 p-6 text-center border-dashed group active:scale-[0.99] transition-all"
                >
                    <div className="rounded-full bg-lime-400 p-2 text-black group-hover:scale-105 transition-transform">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="mt-3 font-bold text-lime-400">Quick Empty Workout</span>
                    <span className="mt-1 text-xs text-zinc-500 max-w-xs">
                        Start a custom, ad-hoc workout on the fly. You can add any exercises as you go.
                    </span>
                </button>

                {/* Templates list */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Start from Template</h3>

                    {templates.length === 0 ? (
                        <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-6 text-center text-zinc-500">
                            <p className="text-sm">
                                No templates found. Go to the &ldquo;Templates&rdquo; tab to create one.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => startWorkout(t)}
                                    className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/40 text-left active:scale-[0.99] transition-all"
                                >
                                    <div>
                                        <h4 className="font-extrabold text-zinc-200">{t.name}</h4>
                                        {t.description && (
                                            <p className="text-sm text-zinc-400 mt-0.5 line-clamp-1">{t.description}</p>
                                        )}
                                        <p className="text-xs text-zinc-500 font-semibold mt-1 uppercase">
                                            {t.template_exercises?.length || 0} exercises
                                        </p>
                                    </div>
                                    <div className="rounded-full bg-zinc-800 p-2 text-lime-400">
                                        <Play className="h-4 w-4 fill-lime-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // CASE 2: LOGGING ACTIVE WORKOUT
    return (
        <div className="space-y-6">
            {/* Rest Timer Banner */}
            {restTimer.isActive && restTimer.timeLeft > 0 && (
                <div className="rounded-2xl border border-lime-500/30 bg-zinc-900 p-4 shadow-lg shadow-lime-500/5 animate-pulse-lime space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Timer className="h-5 w-5 text-lime-400 animate-spin" style={{ animationDuration: "8s" }} />
                            <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                                Rest Countdown
                            </span>
                        </div>
                        <span className="text-xl font-bold text-lime-400">{formatDuration(restTimer.timeLeft)}</span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => adjustRestTimer(-15)}
                            className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-bold text-zinc-300"
                        >
                            -15s
                        </button>
                        <button
                            onClick={() => adjustRestTimer(15)}
                            className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-bold text-zinc-300"
                        >
                            +15s
                        </button>
                        <button
                            onClick={stopRestTimer}
                            className="flex-1 rounded-lg bg-red-950/60 border border-red-500/20 py-1.5 text-xs font-bold text-red-400"
                        >
                            Skip Rest
                        </button>
                    </div>
                </div>
            )}

            {/* Header, Unit Switcher, and Timer */}
            <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
                <div className="space-y-1.5 flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-xl font-black text-zinc-100 flex items-center space-x-2">
                            <span>{localWorkoutName}</span>
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3 text-zinc-400">
                        <div className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-lime-400" />
                            <span className="font-bold">{formatDuration(workoutDuration)}</span>
                        </div>

                        {/* Active Weight Unit Switcher */}
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setActiveWeightUnit("kg")}
                                className={`px-2 py-0.5 text-[10px] font-black rounded transition-all ${
                                    activeWeightUnit === "kg"
                                        ? "bg-lime-400 text-black shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                KG
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveWeightUnit("lbs")}
                                className={`px-2 py-0.5 text-[10px] font-black rounded transition-all ${
                                    activeWeightUnit === "lbs"
                                        ? "bg-lime-400 text-black shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                LBS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={handleCancelClick}
                        className="rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-950/30 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-black text-black shadow-md hover:bg-lime-300 active:scale-95 transition-all"
                    >
                        Finish
                    </button>
                </div>
            </div>

            {/* Exercises Log list */}
            <div className="space-y-4">
                {activeWorkout.exercises.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500 space-y-3">
                        <AlertTriangle className="h-8 w-8 text-zinc-600 mx-auto" />
                        <p className="text-sm">
                            Your workout is empty. Tap below to add exercises and start tracking sets.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeWorkout.exercises.map((le, exIdx) => {
                            const hasSubstitutes = le.substitute_exercises && le.substitute_exercises.length > 0;
                            const isSubstituted = le.originalExerciseId && le.exerciseId !== le.originalExerciseId;

                            return (
                                <div
                                    key={exIdx}
                                    className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4"
                                >
                                    {/* Exercise Header */}
                                    <div className="space-y-2 border-b border-zinc-800 pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2 flex-wrap">
                                                    <h3 className="font-black text-lime-400">{le.exercise?.name}</h3>
                                                    {/* PR Badge if available */}
                                                    {personalRecords[le.exerciseId] && (
                                                        <span className="inline-flex items-center space-x-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                                                            <Trophy className="h-3 w-3 text-amber-400 shrink-0" />
                                                            <span>
                                                                PR:{" "}
                                                                {activeWeightUnit === "lbs"
                                                                    ? `${kgToLbs(personalRecords[le.exerciseId].weight)} lbs`
                                                                    : `${personalRecords[le.exerciseId].weight} kg`}{" "}
                                                                × {personalRecords[le.exerciseId].reps}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 mt-0.5">
                                                    <span className="pr-2 py-0.5 text-xs font-bold text-zinc-400">
                                                        {le.exercise?.category}
                                                    </span>
                                                    {le.rest_time_seconds && (
                                                        <span className="text-xs text-zinc-400">
                                                            ⏱️ Rest: {le.rest_time_seconds}s
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-1.5 shrink-0">
                                                {/* Notes Button */}
                                                <button
                                                    onClick={() => {
                                                        if (openNotesExId === le.exerciseId) {
                                                            setOpenNotesExId(null);
                                                        } else {
                                                            setOpenNotesExId(le.exerciseId);
                                                            setNoteDraft(le.exercise?.notes || "");
                                                        }
                                                    }}
                                                    title="View or edit exercise notes"
                                                    className={`flex items-center space-x-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all active:scale-95 ${
                                                        le.exercise?.notes
                                                            ? "bg-lime-500/10 border-lime-500/30 text-lime-400"
                                                            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-lime-400"
                                                    }`}
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span>Notes{le.exercise?.notes ? " •" : ""}</span>
                                                </button>

                                                {/* Substitute / Swap Button */}
                                                <button
                                                    onClick={() => {
                                                        setSubstitutePickerExIndex(exIdx);
                                                        setShowAddExPicker(true);
                                                    }}
                                                    title="Substitute or swap this exercise"
                                                    className="flex items-center space-x-1 rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-[10px] font-bold text-zinc-300 hover:text-lime-400 hover:border-lime-500/30 active:scale-95 transition-all"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5 text-lime-400" />
                                                    <span>Substitute</span>
                                                </button>

                                                <button
                                                    onClick={() => removeExerciseFromWorkout(exIdx)}
                                                    className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Exercise Notes Box / Editor */}
                                        {(openNotesExId === le.exerciseId || le.exercise?.notes) && (
                                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-1.5 font-bold text-lime-400">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        <span>Exercise Notes</span>
                                                    </div>
                                                    {openNotesExId !== le.exerciseId && (
                                                        <button
                                                            onClick={() => {
                                                                setOpenNotesExId(le.exerciseId);
                                                                setNoteDraft(le.exercise?.notes || "");
                                                            }}
                                                            className="text-[10px] font-bold text-zinc-400 hover:text-lime-400 flex items-center space-x-1"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                            <span>Edit Note</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {openNotesExId === le.exerciseId ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={noteDraft}
                                                            onChange={(e) => setNoteDraft(e.target.value)}
                                                            placeholder="Add exercise notes (e.g. seat height #4, neutral grip)..."
                                                            rows={2}
                                                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none resize-none"
                                                        />
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => setOpenNotesExId(null)}
                                                                className="px-2.5 py-1 text-xs font-bold text-zinc-400 rounded-md hover:bg-zinc-900"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    await updateExerciseNotes(
                                                                        le.exerciseId,
                                                                        noteDraft.trim(),
                                                                    );
                                                                    setOpenNotesExId(null);
                                                                }}
                                                                className="px-3 py-1 text-xs font-bold bg-lime-400 text-black rounded-md hover:bg-lime-300"
                                                            >
                                                                Save Note
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                        {le.exercise?.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Pre-assigned Substitute Exercise options + Revert to original */}
                                        {(hasSubstitutes || isSubstituted) && (
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {/* Revert chip — only shown when currently on a substitute */}
                                                {isSubstituted && (
                                                    <>
                                                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                                                            Active sub:
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                swapExerciseInWorkout(exIdx, le.originalExerciseId!)
                                                            }
                                                            className="flex items-center space-x-1 rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
                                                        >
                                                            <span>↩ Back to {le.originalExercise?.name}</span>
                                                        </button>
                                                    </>
                                                )}

                                                {/* Template-assigned substitute chips */}
                                                {hasSubstitutes && (
                                                    <>
                                                        {!isSubstituted && (
                                                            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                                                                Substitutes:
                                                            </span>
                                                        )}
                                                        {le.substitute_exercises?.map((subEx) => (
                                                            <button
                                                                key={subEx.id}
                                                                onClick={() => swapExerciseInWorkout(exIdx, subEx.id)}
                                                                className="flex items-center space-x-1 rounded-md bg-lime-500/10 border border-lime-500/20 px-2 py-1 text-[10px] font-bold text-lime-400 hover:bg-lime-500/20 active:scale-95 transition-all"
                                                            >
                                                                <RefreshCw className="h-3 w-3" />
                                                                <span>Swap to {subEx.name}</span>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sets Table */}
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                            <span className="col-span-2 text-left">Set</span>
                                            <span className="col-span-3">
                                                Weight ({activeWeightUnit.toUpperCase()})
                                            </span>
                                            <span className="col-span-3">Reps</span>
                                            <span className="col-span-2">Warmup</span>
                                            <span className="col-span-2 text-right">Done</span>
                                        </div>

                                        {le.sets.map((set, setIdx) => {
                                            const displayWeightValue = getWeightInputValue(
                                                exIdx,
                                                setIdx,
                                                set as LogSet,
                                            );

                                            return (
                                                <div
                                                    key={set.id}
                                                    className={`grid grid-cols-12 gap-2 items-center text-center p-1 rounded-lg transition-colors ${
                                                        set.completed ? "bg-lime-500/5 border border-lime-500/10" : ""
                                                    }`}
                                                >
                                                    {/* Set index */}
                                                    <span className="col-span-2 text-left text-xs font-bold text-zinc-400">
                                                        {setIdx + 1}
                                                    </span>

                                                    {/* Weight Input with Conversion */}
                                                    <div className="col-span-3 flex flex-col items-center max-w-36 mx-auto">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="0"
                                                            value={displayWeightValue}
                                                            onChange={(e) =>
                                                                handleWeightInputChange(exIdx, setIdx, e.target.value)
                                                            }
                                                            onBlur={() => {
                                                                const key = `${exIdx}-${setIdx}`;
                                                                setWeightInputDrafts((prev) => {
                                                                    const next = { ...prev };
                                                                    delete next[key];
                                                                    return next;
                                                                });
                                                            }}
                                                            disabled={set.completed}
                                                            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 py-1 text-center text-xs text-zinc-100 focus:border-lime-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>

                                                    {/* Reps Input */}
                                                    <div className="col-span-3 flex flex-col items-center max-w-36 mx-auto">
                                                        <input
                                                            type="number"
                                                            value={set.reps || ""}
                                                            placeholder="0"
                                                            onChange={(e) =>
                                                                updateSet(exIdx, setIdx, {
                                                                    reps: e.target.value || "",
                                                                })
                                                            }
                                                            disabled={set.completed}
                                                            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 py-1 text-center text-xs text-zinc-100 focus:border-lime-500/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>

                                                    {/* Warmup Checkbox */}
                                                    <div className="col-span-2 flex justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={set.is_warmup}
                                                            disabled={set.completed}
                                                            onChange={(e) =>
                                                                updateSet(exIdx, setIdx, {
                                                                    is_warmup: e.target.checked,
                                                                })
                                                            }
                                                            className="h-4 w-4 rounded border border-zinc-700 bg-zinc-950 text-lime-400 focus:ring-2 focus:ring-lime-500/20 focus:ring-offset-0 focus:ring-offset-zinc-950 cursor-pointer accent-lime-500"
                                                        />
                                                    </div>

                                                    {/* Completion checkmark */}
                                                    <div className="col-span-2 flex justify-end">
                                                        <button
                                                            onClick={() => toggleSetCompleted(exIdx, setIdx)}
                                                            className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                                                                set.completed
                                                                    ? "bg-lime-400 border-lime-400 text-black shadow shadow-lime-500/30"
                                                                    : "border-zinc-800 hover:border-zinc-600 text-transparent bg-zinc-950"
                                                            }`}
                                                        >
                                                            <Check className="h-4 w-4 stroke-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Exercise Set Actions */}
                                    <div className="flex space-x-2 pt-2">
                                        <button
                                            onClick={() => addSetToExercise(exIdx)}
                                            className="flex-1 flex items-center justify-center space-x-1 rounded-lg border border-zinc-800 py-2 text-xs text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-all"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Set</span>
                                        </button>
                                        <button
                                            onClick={() => removeSetFromExercise(exIdx, le.sets.length - 1)}
                                            disabled={le.sets.length <= 1}
                                            className="flex-1 flex items-center justify-center space-x-1 rounded-lg border border-zinc-800 py-2 text-xs text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Remove Set</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Global Add Exercise trigger */}
                <button
                    onClick={() => {
                        setSubstitutePickerExIndex(null);
                        setShowAddExPicker(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/10 py-4 text-sm font-bold text-zinc-300 active:scale-[0.99] transition-all"
                >
                    <Plus className="h-4.5 w-4.5 text-lime-400" />
                    <span>Add Exercise</span>
                </button>
            </div>

            {/* FINISH WORKOUT DIALOG MODEL */}
            {showFinishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5 text-lime-400" />
                            <h3 className="text-lg font-bold text-zinc-100">Finish Workout</h3>
                        </div>

                        <p className="text-sm text-zinc-400">
                            Outstanding work! Enter any logs, notes, or details about how your workout felt today.
                        </p>

                        <textarea
                            placeholder="e.g. Felt great. Increased Bench Press reps by 2!"
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none resize-none"
                        />

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => setShowFinishModal(false)}
                                className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-3 text-xs font-bold text-zinc-400"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleFinishSubmit}
                                className="rounded-xl bg-lime-400 py-3 text-xs font-extrabold text-black hover:bg-lime-300 shadow shadow-lime-500/10"
                            >
                                Log Workout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EXERCISE ADD / SUBSTITUTE SELECTOR DIALOG */}
            {showAddExPicker && (
                <div className="fixed inset-0 z-65 flex flex-col bg-zinc-950 p-4 animate-slide-up">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                        <div>
                            <h3 className="text-lg font-bold text-zinc-100">
                                {substitutePickerExIndex !== null ? "Substitute Exercise" : "Add Exercise"}
                            </h3>
                            {substitutePickerExIndex !== null && (
                                <p className="text-xs text-zinc-400">
                                    Swapping:{" "}
                                    <span className="text-lime-400 font-bold">
                                        {activeWorkout.exercises[substitutePickerExIndex]?.exercise?.name}
                                    </span>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setShowAddExPicker(false);
                                setSubstitutePickerExIndex(null);
                            }}
                            className="rounded-lg bg-zinc-950 p-1 text-zinc-400 hover:text-zinc-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="relative mt-4">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search exercise..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Muscle group tabs */}
                    <div className="flex space-x-1.5 overflow-x-auto py-3">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                                    selectedCategory === cat
                                        ? "bg-lime-400 text-black"
                                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Exercises search result list */}
                    <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                        {filteredExercises.length === 0 ? (
                            <p className="text-center text-sm text-zinc-500 py-8">No matching exercises found.</p>
                        ) : (
                            filteredExercises.map((ex) => (
                                <div
                                    key={ex.id}
                                    onClick={() => handleSelectExerciseFromPicker(ex.id)}
                                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/20 p-3.5 hover:bg-zinc-900/40 cursor-pointer transition-colors"
                                >
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-200">{ex.name}</h4>
                                        <p className="text-sm text-zinc-500 font-semibold">{ex.category}</p>
                                    </div>
                                    <div className="rounded-lg bg-zinc-850 p-1.5 text-zinc-500 hover:text-lime-400 flex items-center space-x-1">
                                        {substitutePickerExIndex !== null && (
                                            <span className="text-xs font-bold text-lime-400 mr-1">Swap</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
