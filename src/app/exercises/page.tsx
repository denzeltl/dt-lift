"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDatabase, Exercise } from "@/context/DatabaseContext";
import { Library, Plus, Search, X, Pencil, Trash2, Trophy, FileText, Clock } from "lucide-react";

export default function Exercises() {
    const {
        user,
        exercises,
        createExercise,
        updateExercise,
        deleteExercise,
        lastPerformance,
        personalRecords,
        updateExerciseNotes,
        isLoading,
    } = useDatabase();
    const router = useRouter();

    // Weight unit for displaying performance & PR
    const [perfUnit, setPerfUnit] = useState<"kg" | "lbs">("kg");
    const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;

    // State variables
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Custom exercise creator state
    const [isCreating, setIsCreating] = useState(false);
    const [customName, setCustomName] = useState("");
    const [customCategory, setCustomCategory] = useState("Chest");
    const [customNotes, setCustomNotes] = useState("");

    // Edit exercise state
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("Chest");
    const [editNotes, setEditNotes] = useState("");

    // Delete exercise state
    const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);

    // Redirect to login if user not authenticated
    React.useEffect(() => {
        if (!isLoading && !user) {
            router.push("/");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
                <Library className="h-10 w-10 animate-bounce text-lime-400" />
                <p className="text-sm font-semibold text-zinc-400">Loading Exercises...</p>
            </div>
        );
    }

    // Categories list
    const categories = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
    const inputCategories = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

    // Filter exercises
    const filteredExercises = exercises.filter((ex) => {
        const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = selectedCategory === "All" || ex.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    // Handle Custom Exercise save
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) {
            alert("Exercise Name is required");
            return;
        }

        try {
            const newEx = await createExercise(customName.trim(), customCategory);
            if (customNotes.trim()) {
                await updateExerciseNotes(newEx.id, customNotes.trim());
            }
            setCustomName("");
            setCustomCategory("Chest");
            setCustomNotes("");
            setIsCreating(false);
        } catch (err) {
            console.error("Failed to create exercise", err);
        }
    };

    // Handle Start Edit
    const handleStartEdit = (ex: Exercise) => {
        setEditingExercise(ex);
        setEditName(ex.name);
        setEditCategory(ex.category);
        setEditNotes(ex.notes || "");
    };

    // Handle Save Edit
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExercise || !editName.trim()) {
            alert("Exercise Name is required");
            return;
        }

        try {
            await updateExercise(editingExercise.id, editName.trim(), editCategory);
            await updateExerciseNotes(editingExercise.id, editNotes.trim());
            setEditingExercise(null);
        } catch (err) {
            console.error("Failed to update exercise", err);
        }
    };

    // Handle Confirm Delete
    const handleConfirmDelete = async () => {
        if (!deletingExercise) return;

        try {
            await deleteExercise(deletingExercise.id);
            setDeletingExercise(null);
        } catch (err) {
            console.error("Failed to delete exercise", err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-zinc-100 flex items-center space-x-2">
                        <Library className="h-6 w-6 text-lime-400" />
                        <span>Exercises</span>
                    </h1>
                    <p className="text-sm text-zinc-400 font-medium">Browse library or create, edit, add exercises.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Performance unit toggle */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => setPerfUnit("kg")}
                            className={`px-2 py-1 text-[10px] font-black rounded transition-all ${
                                perfUnit === "kg"
                                    ? "bg-lime-400 text-black shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            KG
                        </button>
                        <button
                            type="button"
                            onClick={() => setPerfUnit("lbs")}
                            className={`px-2 py-1 text-[10px] font-black rounded transition-all ${
                                perfUnit === "lbs"
                                    ? "bg-lime-400 text-black shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                            }`}
                        >
                            LBS
                        </button>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-black shadow-md hover:bg-lime-300 active:scale-95 transition-transform"
                    >
                        <Plus className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                    />
                </div>

                {/* Categories Tab */}
                <div className="flex space-x-1.5 overflow-x-auto py-1">
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
            </div>

            {/* Exercises list */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">
                    Showing {filteredExercises.length} Exercises
                </h3>

                {filteredExercises.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-8 text-center text-zinc-500">
                        <p className="text-sm">No exercises matched your search query or category.</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {filteredExercises.map((ex) => {
                            const isCustom = ex.id && !ex.id.startsWith("def-");
                            const perf = lastPerformance[ex.id];
                            const pr = personalRecords[ex.id];

                            return (
                                <div
                                    key={ex.id}
                                    className="flex flex-col space-y-2.5 rounded-xl border border-zinc-900 bg-zinc-900/20 p-4 hover:border-zinc-800 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 min-w-0 pr-2">
                                            <h4 className="text-sm font-extrabold text-zinc-200">{ex.name}</h4>
                                            <div className="flex items-center flex-wrap gap-1.5">
                                                <span className="rounded bg-zinc-850 py-0.5 text-xs font-bold text-zinc-400">
                                                    {ex.category}
                                                </span>
                                                {isCustom && (
                                                    <span className="rounded bg-lime-500/15 border border-lime-500/20 px-2 py-0.5 text-xs font-bold text-lime-400">
                                                        Custom
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1.5 shrink-0">
                                            <button
                                                onClick={() => handleStartEdit(ex)}
                                                title="Edit exercise & notes"
                                                className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-lime-400 hover:border-lime-500/30 active:scale-95 transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingExercise(ex)}
                                                title="Remove exercise"
                                                className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-400 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row: PR & Last Session */}
                                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                                        {/* PR Badge */}
                                        {pr ? (
                                            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                                <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                                <span className="font-semibold text-amber-300">
                                                    PR:{" "}
                                                    {perfUnit === "lbs"
                                                        ? `${kgToLbs(pr.weight)} lbs`
                                                        : `${pr.weight} kg`}{" "}
                                                    × {pr.reps} reps
                                                </span>
                                                <span className="text-[10px] text-amber-400/60 font-medium">
                                                    (
                                                    {new Date(pr.date).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                    )
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-1.5 text-zinc-500 bg-zinc-900/50 border border-zinc-850 px-2.5 py-1 rounded-lg">
                                                <Trophy className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                                                <span className="font-medium">No PR set yet</span>
                                            </div>
                                        )}

                                        {/* Last Session */}
                                        {perf && (
                                            <div className="flex items-center space-x-1.5 text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                                                <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                                <span>
                                                    Last:{" "}
                                                    {perfUnit === "lbs"
                                                        ? `${kgToLbs(perf.weight)} lbs`
                                                        : `${perf.weight} kg`}{" "}
                                                    × {perf.reps} reps
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Exercise Notes */}
                                    {ex.notes && (
                                        <div className="flex items-start space-x-2 bg-zinc-950/70 border border-zinc-800/60 rounded-lg p-2.5">
                                            <FileText className="h-3.5 w-3.5 text-lime-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                                {ex.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CREATE CUSTOM EXERCISE OVERLAY */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 p-4 animate-slide-up overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                        <h2 className="text-lg font-black text-zinc-100 flex items-center space-x-2">
                            <Library className="h-5 w-5 text-lime-400" />
                            <span>Create Exercise</span>
                        </h2>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="rounded-lg bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-transform"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSave} className="flex-1 py-6 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Exercise Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Incline Dumbbell Press"
                                value={customName}
                                onChange={(e) => setCustomName(e.target.value)}
                                required
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Muscle Category
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                {inputCategories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCustomCategory(cat)}
                                        className={`rounded-xl py-3 text-xs font-bold border transition-colors ${
                                            customCategory === cat
                                                ? "bg-lime-500/10 border-lime-400 text-lime-400"
                                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Exercise Notes (Optional)
                            </label>
                            <textarea
                                placeholder="e.g. Seat position #4, keep elbows at 45 degrees, pause at bottom."
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none resize-none transition-colors"
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-6 border-t border-zinc-900 flex space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 py-3.5 text-sm font-bold text-zinc-300 active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-xl bg-lime-400 py-3.5 text-sm font-extrabold text-black hover:bg-lime-300 active:scale-[0.98] transition-all"
                            >
                                Create Exercise
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* EDIT EXERCISE OVERLAY */}
            {editingExercise && (
                <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 p-4 animate-slide-up overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                        <h2 className="text-lg font-black text-zinc-100 flex items-center space-x-2">
                            <Pencil className="h-5 w-5 text-lime-400" />
                            <span>Edit Exercise</span>
                        </h2>
                        <button
                            onClick={() => setEditingExercise(null)}
                            className="rounded-lg bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-transform"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleUpdate} className="flex-1 py-6 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Exercise Name
                            </label>
                            <input
                                type="text"
                                placeholder="Exercise Name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Muscle Category
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                {inputCategories.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setEditCategory(cat)}
                                        className={`rounded-xl py-3 text-xs font-bold border transition-colors ${
                                            editCategory === cat
                                                ? "bg-lime-500/10 border-lime-400 text-lime-400"
                                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Exercise Notes
                            </label>
                            <textarea
                                placeholder="e.g. Seat position #4, keep elbows at 45 degrees, pause at bottom."
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none resize-none transition-colors"
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div className="pt-6 border-t border-zinc-900 flex space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setEditingExercise(null)}
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 py-3.5 text-sm font-bold text-zinc-300 active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-xl bg-lime-400 py-3.5 text-sm font-extrabold text-black hover:bg-lime-300 active:scale-[0.98] transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingExercise && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center space-x-3 text-red-400">
                            <div className="rounded-full bg-red-500/10 p-3 border border-red-500/20">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-zinc-100">Remove Exercise</h3>
                                <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-300">
                            Are you sure you want to remove{" "}
                            <span className="font-bold text-lime-400">{deletingExercise.name}</span> from your exercise
                            library?
                        </p>

                        <div className="flex space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeletingExercise(null)}
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 active:scale-[0.98] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500 active:scale-[0.98] transition-all shadow-lg shadow-red-600/20"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
