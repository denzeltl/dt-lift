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
                    <h1 className="text-4xl text-zinc-100">Start workout</h1>
                    <p className="mt-1 text-zinc-500">Pick a template, or start empty and add exercises as you go.</p>
                </div>

                {/* Start Empty */}
                <button
                    onClick={handleStartEmpty}
                    className="group w-full flex items-center gap-4 rounded-2xl bg-lime-400 p-5 text-left text-white btn-stamp"
                >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-zinc-800 bg-zinc-900 text-zinc-100 transition-transform duration-200 group-hover:rotate-90">
                        <Plus className="h-6 w-6" />
                    </span>
                    <span className="min-w-0">
                        <span className="font-display block text-2xl leading-none">Empty workout</span>
                        <span className="mt-1 block text-sm text-white/85">Add exercises as you go.</span>
                    </span>
                </button>

                {/* Templates list */}
                <div className="space-y-3">
                    <h2 className="text-2xl text-zinc-100">From a template</h2>

                    {templates.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-zinc-800/40 p-6 text-center text-zinc-500">
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
                                    className="w-full flex items-center justify-between gap-3 rounded-xl p-4 text-left slab slab-press"
                                >
                                    <div className="min-w-0">
                                        <h3 className="font-display text-xl text-zinc-100">{t.name}</h3>
                                        {t.description && (
                                            <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">{t.description}</p>
                                        )}
                                        <p className="font-mono text-[11px] text-zinc-500 font-semibold mt-1.5 uppercase tracking-wider">
                                            {t.template_exercises?.length || 0} exercises
                                        </p>
                                    </div>
                                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[2.5px] border-zinc-800 bg-lime-400 text-white">
                                        <Play className="h-4 w-4 fill-white translate-x-px" />
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
                <div className="rest-card rounded-2xl p-4 space-y-3" role="timer" aria-live="off">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Timer className="h-5 w-5 text-volt" />
                            <span className="font-mono text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">Rest</span>
                        </div>
                        <span className="font-display text-6xl leading-none text-volt">{formatDuration(restTimer.timeLeft)}</span>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => adjustRestTimer(-15)}
                            className="flex-1 min-h-11 rounded-lg bg-zinc-950 text-sm font-bold text-zinc-100 active:scale-95 transition-transform"
                        >
                            -15s
                        </button>
                        <button
                            onClick={() => adjustRestTimer(15)}
                            className="flex-1 min-h-11 rounded-lg bg-zinc-950 text-sm font-bold text-zinc-100 active:scale-95 transition-transform"
                        >
                            +15s
                        </button>
                        <button
                            onClick={stopRestTimer}
                            className="flex-1 min-h-11 rounded-lg bg-lime-400 text-sm font-bold text-white active:scale-95 transition-transform"
                        >
                            Skip Rest
                        </button>
                    </div>
                </div>
            )}

            {/* Header, Unit Switcher, and Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-800/15 pb-4">
                <div className="space-y-2 w-full min-w-0">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-3xl text-zinc-100 break-words">{localWorkoutName}</h1>
                    </div>

                    <div className="flex items-center space-x-3 text-zinc-400">
                        <div className="flex items-center space-x-1.5">
                            <Clock className="h-4 w-4 text-lime-400" />
                            <span className="font-mono font-semibold text-zinc-100">{formatDuration(workoutDuration)}</span>
                        </div>

                        {/* Active Weight Unit Switcher */}
                        <div className="flex items-center bg-zinc-900 border-2 border-zinc-800 rounded-lg p-0.5" role="group" aria-label="Weight unit">
                            <button
                                type="button"
                                onClick={() => setActiveWeightUnit("kg")}
                                aria-pressed={activeWeightUnit === "kg"}
                                className={`px-2.5 py-1 font-mono text-[11px] font-semibold rounded transition-colors ${
                                    activeWeightUnit === "kg"
                                        ? "bg-lime-400 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                KG
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveWeightUnit("lbs")}
                                aria-pressed={activeWeightUnit === "lbs"}
                                className={`px-2.5 py-1 font-mono text-[11px] font-semibold rounded transition-colors ${
                                    activeWeightUnit === "lbs"
                                        ? "bg-lime-400 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                                LBS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="ml-auto flex space-x-2">
                    <button
                        onClick={handleCancelClick}
                        className="rounded-xl border-2 border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm font-bold text-red-400 active:scale-95 transition-transform"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-white hover:bg-lime-300 btn-stamp"
                    >
                        Finish
                    </button>
                </div>
            </div>

            {/* Exercises Log list */}
            <div className="space-y-4">
                {activeWorkout.exercises.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-zinc-800/40 p-10 text-center text-zinc-500 space-y-3">
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
                                    className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4 slab"
                                >
                                    {/* Exercise Header */}
                                    <div className="space-y-2 border-b-2 border-zinc-800 pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-display text-2xl leading-none text-zinc-100">{le.exercise?.name}</h3>
                                                    {/* PR Badge if available */}
                                                    {personalRecords[le.exerciseId] && (
                                                        <span className="inline-flex items-center space-x-1 rounded border-2 border-amber-500 bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-400">
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
                                                    <span className="pr-2 py-0.5 text-sm font-semibold text-zinc-500">
                                                        {le.exercise?.category}
                                                    </span>
                                                    {le.rest_time_seconds && (
                                                        <span className="font-mono text-xs text-zinc-500">
                                                            Rest {le.rest_time_seconds}s
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
                                                    className={`items-center space-x-1 rounded-lg border-2 px-2.5 py-2 text-xs font-bold transition-all active:scale-95 sm:flex hidden ${
                                                        le.exercise?.notes
                                                            ? "bg-zinc-900 border-lime-400 text-lime-400"
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
                                                    className="items-center space-x-1 rounded-lg bg-zinc-900 border-2 border-zinc-800 px-2.5 py-2 text-xs font-bold text-zinc-300 hover:text-lime-400 active:scale-95 transition-all sm:flex hidden"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5 text-lime-400" />
                                                    <span>Substitute</span>
                                                </button>

                                                <button
                                                    onClick={() => removeExerciseFromWorkout(exIdx)}
                                                    aria-label={`Remove ${le.exercise?.name ?? "exercise"}`}
                                                    className="grid h-10 w-10 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-850 hover:text-red-400 active:scale-90 transition-transform"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="items-center justify-end space-x-1.5 shrink-0 sm:hidden flex">
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
                                                className={`items-center space-x-1 rounded-lg border-2 px-2.5 py-2 text-xs font-bold transition-all active:scale-95 flex ${
                                                    le.exercise?.notes
                                                        ? "bg-zinc-900 border-lime-400 text-lime-400"
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
                                                className="items-center space-x-1 rounded-lg bg-zinc-900 border-2 border-zinc-800 px-2.5 py-2 text-xs font-bold text-zinc-300 hover:text-lime-400 active:scale-95 transition-all flex"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5 text-lime-400" />
                                                <span>Substitute</span>
                                            </button>
                                        </div>

                                        {/* Exercise Notes Box / Editor */}
                                        {(openNotesExId === le.exerciseId || le.exercise?.notes) && (
                                            <div className="rounded-xl border-2 border-zinc-800 bg-zinc-950 p-3 space-y-2 text-sm">
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
                                                                className="btn-stamp px-3 py-1.5 text-xs font-bold bg-lime-400 text-white rounded-md"
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
                                                            className="flex items-center space-x-1 rounded-md bg-zinc-850 border-2 border-zinc-800 px-2 py-1.5 text-xs font-bold text-zinc-100 active:scale-95 transition-transform"
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
                                                                className="flex items-center space-x-1 rounded-md bg-zinc-900 border-2 border-lime-400 px-2 py-1.5 text-xs font-bold text-lime-400 active:scale-95 transition-transform"
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
                                        <div className="grid grid-cols-12 gap-2 text-center font-mono text-[11px] font-semibold text-zinc-500 uppercase tracking-wider pl-1">
                                            <span className="col-span-2 text-left">Set</span>
                                            <span className="col-span-3">
                                                Weight ({activeWeightUnit.toUpperCase()})
                                            </span>
                                            <span className="col-span-3">Reps</span>
                                            <span className="col-span-2">Warm</span>
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
                                                        set.completed ? "bg-zinc-850" : ""
                                                    }`}
                                                >
                                                    {/* Set index */}
                                                    <span className="col-span-2 text-left pl-1 font-display text-lg text-zinc-100">
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
                                                            aria-label={`Set ${setIdx + 1} weight`}
                                                            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 py-2 text-center font-mono text-sm font-semibold text-zinc-100 focus:outline-none disabled:border-zinc-800/30 disabled:bg-transparent disabled:text-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                            aria-label={`Set ${setIdx + 1} reps`}
                                                            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 py-2 text-center font-mono text-sm font-semibold text-zinc-100 focus:outline-none disabled:border-zinc-800/30 disabled:bg-transparent disabled:text-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                            aria-label={`Set ${setIdx + 1} is a warm-up`}
                                                            className="h-5 w-5 cursor-pointer"
                                                        />
                                                    </div>

                                                    {/* Completion checkmark */}
                                                    <div className="col-span-2 flex justify-end">
                                                        <button
                                                            onClick={() => toggleSetCompleted(exIdx, setIdx)}
                                                            aria-label={`Set ${setIdx + 1} done`}
                                                            aria-pressed={set.completed}
                                                            data-done={set.completed}
                                                            className={`plate-check flex h-10 w-10 items-center justify-center ${
                                                                set.completed ? "" : "text-transparent"
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
                                            className="flex-1 flex min-h-11 items-center justify-center space-x-1 rounded-lg border-2 border-zinc-800 bg-zinc-900 text-sm font-bold text-zinc-100 active:scale-95 transition-transform"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Set</span>
                                        </button>
                                        <button
                                            onClick={() => removeSetFromExercise(exIdx, le.sets.length - 1)}
                                            disabled={le.sets.length <= 1}
                                            className="flex-1 flex min-h-11 items-center justify-center space-x-1 rounded-lg border-2 border-zinc-800/30 text-sm font-semibold text-zinc-500 hover:text-red-400 active:scale-95 disabled:opacity-40 disabled:hover:text-zinc-500 transition-transform"
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
                    className="w-full flex items-center justify-center space-x-2 rounded-2xl border-[2.5px] border-dashed border-zinc-800 bg-zinc-900 py-4 font-bold text-zinc-100 active:scale-[0.99] transition-transform"
                >
                    <Plus className="h-4.5 w-4.5 text-lime-400" />
                    <span>Add Exercise</span>
                </button>
            </div>

            {/* FINISH WORKOUT DIALOG MODEL */}
            {showFinishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 slab">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5 text-lime-400" />
                            <h2 className="text-3xl text-zinc-100">Finish workout</h2>
                        </div>

                        <p className="text-sm text-zinc-400">
                            Good work. Add a note about how it went, or log it as is.
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
                                className="rounded-xl border-2 border-zinc-800 bg-zinc-900 py-3 text-sm font-bold text-zinc-100 active:scale-95 transition-transform"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={handleFinishSubmit}
                                className="rounded-xl bg-lime-400 py-3 text-sm font-bold text-white hover:bg-lime-300 btn-stamp"
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
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800/15">
                        <div>
                            <h3 className="font-display text-2xl text-zinc-100">
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
                            aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg border-2 border-zinc-800 bg-zinc-900 text-zinc-100 active:scale-90 transition-transform"
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
                                className={`rounded-lg border-2 px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors ${
                                    selectedCategory === cat
                                        ? "bg-lime-400 border-zinc-800 text-white"
                                        : "bg-zinc-900 border-zinc-800/25 text-zinc-400 hover:text-zinc-100"
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
                                    className="flex items-center justify-between rounded-xl p-3.5 cursor-pointer slab slab-press"
                                >
                                    <div>
                                        <h4 className="font-bold text-zinc-100">{ex.name}</h4>
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
