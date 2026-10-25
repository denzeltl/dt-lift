"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/utils/supabase/client";

// Interfaces
export interface Profile {
    id: string;
    email: string;
    full_name?: string;
}

export interface Exercise {
    id: string;
    user_id?: string | null;
    name: string;
    category: string; // 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'
    notes?: string;
    created_at?: string;
}

export interface SetTemplate {
    weight: number;
    reps: number;
    is_warmup: boolean;
}

export interface PersonalRecord {
    weight: number;
    reps: number;
    date: string;
}

export interface TemplateExercise {
    id: string;
    template_id: string;
    exercise_id: string;
    sequence: number;
    notes?: string;
    sets_json: SetTemplate[];
    rest_time_seconds?: number;
    substitute_exercise_ids?: string[];
    // Joined fields for display
    exercise?: Exercise;
    substitute_exercises?: Exercise[];
}

export interface Template {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    created_at?: string;
    template_exercises?: TemplateExercise[];
}

export interface WorkoutSet {
    id?: string;
    workout_id: string;
    exercise_id: string;
    sequence: number;
    weight: number;
    reps: number;
    is_warmup: boolean;
    completed: boolean;
    // Joined fields
    exercise?: Exercise;
}

export interface Workout {
    id: string;
    user_id: string;
    name: string;
    start_time: string;
    end_time: string | null;
    notes?: string;
    created_at?: string;
    workout_sets?: WorkoutSet[];
}

export interface LastPerformance {
    weight: number;
    reps: number;
    date: string;
}

interface DatabaseContextType {
    user: Profile | null;
    isLoading: boolean;
    isLocalOnly: boolean;
    login: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
    signup: (email: string, password: string, fullName: string) => Promise<{ error: { message: string } | null }>;
    logout: () => Promise<void>;
    loginAsGuest: () => void;
    exercises: Exercise[];
    createExercise: (name: string, category: string) => Promise<Exercise>;
    updateExercise: (id: string, name: string, category: string) => Promise<void>;
    deleteExercise: (id: string) => Promise<void>;
    templates: Template[];
    saveTemplate: (
        name: string,
        description: string,
        exercises: {
            exercise_id: string;
            sets: SetTemplate[];
            rest_time_seconds?: number;
            substitute_exercise_ids?: string[];
        }[],
        templateId?: string,
    ) => Promise<Template>;
    deleteTemplate: (id: string) => Promise<void>;
    workouts: Workout[];
    saveWorkout: (
        name: string,
        startTime: string,
        endTime: string,
        notes: string,
        sets: { exercise_id: string; weight: number; reps: number; is_warmup: boolean }[],
    ) => Promise<Workout>;
    deleteWorkout: (id: string) => Promise<void>;
    lastPerformance: Record<string, LastPerformance>;
    getLastPerformance: (exerciseId: string) => LastPerformance | null;
    getLastPerformanceSets: (exerciseId: string) => SetTemplate[] | null;
    personalRecords: Record<string, PersonalRecord>;
    getPersonalRecord: (exerciseId: string) => PersonalRecord | null;
    updateExerciseNotes: (id: string, notes: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const DEFAULT_EXERCISES: Exercise[] = [
    { id: "def00000-0000-0000-0000-000000000001", name: "Bench Press (Barbell)", category: "Chest" },
    { id: "def00000-0000-0000-0000-000000000002", name: "Incline Bench Press (Barbell)", category: "Chest" },
    { id: "def00000-0000-0000-0000-000000000003", name: "Dumbbell Flye", category: "Chest" },
    { id: "def00000-0000-0000-0000-000000000004", name: "Push-up", category: "Chest" },
    { id: "def00000-0000-0000-0000-000000000005", name: "Squat (Barbell)", category: "Legs" },
    { id: "def00000-0000-0000-0000-000000000006", name: "Leg Press", category: "Legs" },
    { id: "def00000-0000-0000-0000-000000000007", name: "Lying Leg Curl", category: "Legs" },
    { id: "def00000-0000-0000-0000-000000000008", name: "Leg Extension", category: "Legs" },
    { id: "def00000-0000-0000-0000-000000000009", name: "Deadlift (Barbell)", category: "Back" },
    { id: "def00000-0000-0000-0000-000000000010", name: "Pull-up", category: "Back" },
    { id: "def00000-0000-0000-0000-000000000011", name: "Lat Pulldown", category: "Back" },
    { id: "def00000-0000-0000-0000-000000000012", name: "Bent Over Row (Barbell)", category: "Back" },
    { id: "def00000-0000-0000-0000-000000000013", name: "Overhead Press (Barbell)", category: "Shoulders" },
    { id: "def00000-0000-0000-0000-000000000014", name: "Lateral Raise (Dumbbell)", category: "Shoulders" },
    { id: "def00000-0000-0000-0000-000000000015", name: "Rear Delt Flye", category: "Shoulders" },
    { id: "def00000-0000-0000-0000-000000000016", name: "Bicep Curl (Barbell)", category: "Arms" },
    { id: "def00000-0000-0000-0000-000000000017", name: "Hammer Curl (Dumbbell)", category: "Arms" },
    { id: "def00000-0000-0000-0000-000000000018", name: "Tricep Pushdown", category: "Arms" },
    { id: "def00000-0000-0000-0000-000000000019", name: "Tricep Overhead Extension", category: "Arms" },
    { id: "def00000-0000-0000-0000-000000000020", name: "Plank", category: "Core" },
    { id: "def00000-0000-0000-0000-000000000021", name: "Crunch", category: "Core" },
    { id: "def00000-0000-0000-0000-000000000022", name: "Treadmill Running", category: "Cardio" },
];

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLocalOnly, setIsLocalOnly] = useState(!isSupabaseConfigured);

    // Local Storage Data states
    const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
    const [localTemplates, setLocalTemplates] = useState<Template[]>([]);
    const [localWorkouts, setLocalWorkouts] = useState<Workout[]>([]);
    const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
    const [editedExercises, setEditedExercises] = useState<Record<string, { name: string; category: string }>>({});

    const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});

    // Database Data states
    const [dbExercises, setDbExercises] = useState<Exercise[]>([]);
    const [dbTemplates, setDbTemplates] = useState<Template[]>([]);
    const [dbWorkouts, setDbWorkouts] = useState<Workout[]>([]);

    // Unified lists
    const rawExercises = [...DEFAULT_EXERCISES, ...(isLocalOnly ? localExercises : dbExercises)];
    const exercises = rawExercises
        .filter((ex) => !deletedExerciseIds.includes(ex.id))
        .map((ex) => {
            const edited = editedExercises[ex.id];
            const note = exerciseNotes[ex.id] ?? ex.notes ?? "";
            return {
                ...ex,
                name: edited ? edited.name : ex.name,
                category: edited ? edited.category : ex.category,
                notes: note,
            };
        });
    const rawTemplates = isLocalOnly ? localTemplates : dbTemplates;
    const templates = rawTemplates.map((t) => ({
        ...t,
        template_exercises: t.template_exercises?.map((te) => ({
            ...te,
            substitute_exercises:
                te.substitute_exercises ||
                ((te.substitute_exercise_ids || [])
                    .map((subId) => exercises.find((ex) => ex.id === subId))
                    .filter(Boolean) as Exercise[]),
        })),
    }));
    const workouts = isLocalOnly ? localWorkouts : dbWorkouts;

    // Derive last performance per exercise from workout history
    // For each exercise, find the most recent non-warmup completed set
    const lastPerformance: Record<string, LastPerformance> = React.useMemo(() => {
        const result: Record<string, LastPerformance> = {};
        // workouts are already sorted newest-first
        for (const w of workouts) {
            if (!w.workout_sets) continue;
            for (const s of w.workout_sets) {
                if (s.is_warmup) continue;
                if (!result[s.exercise_id]) {
                    result[s.exercise_id] = {
                        weight: s.weight,
                        reps: s.reps,
                        date: w.start_time,
                    };
                }
            }
        }
        return result;
    }, [workouts]);

    const getLastPerformance = (exerciseId: string): LastPerformance | null => lastPerformance[exerciseId] ?? null;

    // Derive Personal Record (PR) per exercise across all workout history
    // PR is the completed set with maximum weight (and highest reps at that weight)
    const personalRecords: Record<string, PersonalRecord> = React.useMemo(() => {
        const result: Record<string, PersonalRecord> = {};
        for (const w of workouts) {
            if (!w.workout_sets) continue;
            for (const s of w.workout_sets) {
                if (s.is_warmup) continue;
                const currentPr = result[s.exercise_id];
                if (
                    !currentPr ||
                    s.weight > currentPr.weight ||
                    (s.weight === currentPr.weight && s.reps > currentPr.reps)
                ) {
                    result[s.exercise_id] = {
                        weight: s.weight,
                        reps: s.reps,
                        date: w.start_time,
                    };
                }
            }
        }
        return result;
    }, [workouts]);

    const getPersonalRecord = (exerciseId: string): PersonalRecord | null => personalRecords[exerciseId] ?? null;

    const getLastPerformanceSets = (exerciseId: string): SetTemplate[] | null => {
        for (const w of workouts) {
            if (!w.workout_sets || w.workout_sets.length === 0) continue;
            const matchingSets = w.workout_sets.filter((s) => s.exercise_id === exerciseId);
            if (matchingSets.length > 0) {
                const sorted = [...matchingSets].sort((a, b) => a.sequence - b.sequence);
                return sorted.map((s) => ({
                    weight: s.weight,
                    reps: s.reps,
                    is_warmup: s.is_warmup,
                }));
            }
        }
        return null;
    };

    // Fetch from Supabase
    const fetchDbData = async (userId: string) => {
        if (!supabase) return;

        try {
            // 1. Fetch custom exercises
            const { data: exData } = await supabase
                .from("exercises")
                .select("*")
                .or(`user_id.eq.${userId},user_id.is.null`);
            if (exData) {
                // filter out pre-seeded from custom list to avoid duplicates if database has default seed too
                const uniqueDbEx = (exData as Exercise[]).filter((ex) => ex.user_id !== null);
                setDbExercises(uniqueDbEx);
            }

            // 2. Fetch templates with exercises
            const { data: tempData } = await supabase
                .from("templates")
                .select(
                    `
          *,
          template_exercises (
            *,
            exercise:exercises(*)
          )
        `,
                )
                .eq("user_id", userId);
            if (tempData) {
                setDbTemplates(tempData as Template[]);
            }

            // 3. Fetch workouts with sets
            const { data: workData } = await supabase
                .from("workouts")
                .select(
                    `
          *,
          workout_sets (
            *,
            exercise:exercises(*)
          )
        `,
                )
                .eq("user_id", userId)
                .order("start_time", { ascending: false });
            if (workData) {
                setDbWorkouts(workData as Workout[]);
            }
        } catch (e) {
            console.error("Error fetching Supabase data, failing back to local storage displays", e);
        }
    };

    // Initialize Auth & Local Data
    useEffect(() => {
        // Load local storage if client-side
        const loadLocalStorage = () => {
            const storedUser = localStorage.getItem("dt_lift_guest_user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                setIsLocalOnly(true);
            }

            const storedExercises = localStorage.getItem("dt_lift_local_exercises");
            if (storedExercises) setLocalExercises(JSON.parse(storedExercises));

            const storedDeleted = localStorage.getItem("dt_lift_deleted_exercises");
            if (storedDeleted) setDeletedExerciseIds(JSON.parse(storedDeleted));

            const storedEdited = localStorage.getItem("dt_lift_edited_exercises");
            if (storedEdited) setEditedExercises(JSON.parse(storedEdited));

            const storedNotes = localStorage.getItem("dt_lift_exercise_notes");
            if (storedNotes) setExerciseNotes(JSON.parse(storedNotes));

            const storedTemplates = localStorage.getItem("dt_lift_local_templates");
            if (storedTemplates) setLocalTemplates(JSON.parse(storedTemplates));

            const storedWorkouts = localStorage.getItem("dt_lift_local_workouts");
            if (storedWorkouts) setLocalWorkouts(JSON.parse(storedWorkouts));
        };

        loadLocalStorage();
        // Guest-only builds have nothing async to wait for.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of localStorage, which SSR cannot see
        if (!isSupabaseConfigured) setIsLoading(false);

        // Setup Supabase listener if configured
        if (isSupabaseConfigured && supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email || "",
                        full_name: session.user.user_metadata?.full_name || "",
                    });
                    setIsLocalOnly(false);
                    fetchDbData(session.user.id);
                } else {
                    // If no supabase session, make sure we only default to guest if guest user is set
                    const storedUser = localStorage.getItem("dt_lift_guest_user");
                    if (!storedUser) {
                        setUser(null);
                    }
                }
                setIsLoading(false);
            });

            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email || "",
                        full_name: session.user.user_metadata?.full_name || "",
                    });
                    setIsLocalOnly(false);
                    fetchDbData(session.user.id);
                } else {
                    const storedUser = localStorage.getItem("dt_lift_guest_user");
                    if (!storedUser) {
                        setUser(null);
                        setDbExercises([]);
                        setDbTemplates([]);
                        setDbWorkouts([]);
                    }
                }
                setIsLoading(false);
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, []);

    // Auth Operations
    const login = async (email: string, password: string) => {
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data?.user) {
                localStorage.removeItem("dt_lift_guest_user");
                setIsLocalOnly(false);
            }
            return { error };
        } else {
            // Emulate auth locally
            const mockUser: Profile = { id: "guest-1", email, full_name: "Guest User" };
            localStorage.setItem("dt_lift_guest_user", JSON.stringify(mockUser));
            setUser(mockUser);
            setIsLocalOnly(true);
            return { error: null };
        }
    };

    const signup = async (email: string, password: string, fullName: string) => {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                },
            });
            return { error };
        } else {
            // Emulate signup locally
            const mockUser: Profile = { id: "guest-1", email, full_name: fullName };
            localStorage.setItem("dt_lift_guest_user", JSON.stringify(mockUser));
            setUser(mockUser);
            setIsLocalOnly(true);
            return { error: null };
        }
    };

    const logout = async () => {
        if (isSupabaseConfigured && supabase && !isLocalOnly) {
            await supabase.auth.signOut();
        }
        localStorage.removeItem("dt_lift_guest_user");
        setUser(null);
        setIsLocalOnly(!isSupabaseConfigured);
    };

    const loginAsGuest = () => {
        const mockUser: Profile = { id: "guest-uid", email: "guest@dtlift.app", full_name: "Guest lifter" };
        localStorage.setItem("dt_lift_guest_user", JSON.stringify(mockUser));
        setUser(mockUser);
        setIsLocalOnly(true);
    };

    // Exercise Operations
    const createExercise = async (name: string, category: string): Promise<Exercise> => {
        const newEx: Exercise = {
            id: crypto.randomUUID(),
            name,
            category,
            user_id: user?.id || "guest-uid",
        };

        if (!isLocalOnly && supabase && user) {
            const { data, error } = await supabase
                .from("exercises")
                .insert({ name, category, user_id: user.id })
                .select()
                .single();
            if (!error && data) {
                setDbExercises((prev) => [...prev, data as Exercise]);
                return data as Exercise;
            }
        }

        // LocalStorage fallback
        const updated = [...localExercises, newEx];
        setLocalExercises(updated);
        localStorage.setItem("dt_lift_local_exercises", JSON.stringify(updated));
        return newEx;
    };

    const updateExercise = async (id: string, name: string, category: string): Promise<void> => {
        if (!isLocalOnly && supabase && user && !id.startsWith("def")) {
            const { error } = await supabase.from("exercises").update({ name, category }).eq("id", id);
            if (!error) {
                setDbExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, name, category } : ex)));
            }
        }

        if (localExercises.some((ex) => ex.id === id)) {
            const updated = localExercises.map((ex) => (ex.id === id ? { ...ex, name, category } : ex));
            setLocalExercises(updated);
            localStorage.setItem("dt_lift_local_exercises", JSON.stringify(updated));
        }

        const updatedEdited = {
            ...editedExercises,
            [id]: { name, category },
        };
        setEditedExercises(updatedEdited);
        localStorage.setItem("dt_lift_edited_exercises", JSON.stringify(updatedEdited));
    };

    const updateExerciseNotes = async (id: string, notes: string): Promise<void> => {
        if (!isLocalOnly && supabase && user && !id.startsWith("def")) {
            const { error } = await supabase.from("exercises").update({ notes }).eq("id", id);
            if (!error) {
                setDbExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, notes } : ex)));
            }
        }

        if (localExercises.some((ex) => ex.id === id)) {
            const updated = localExercises.map((ex) => (ex.id === id ? { ...ex, notes } : ex));
            setLocalExercises(updated);
            localStorage.setItem("dt_lift_local_exercises", JSON.stringify(updated));
        }

        const updatedNotes = {
            ...exerciseNotes,
            [id]: notes,
        };
        setExerciseNotes(updatedNotes);
        localStorage.setItem("dt_lift_exercise_notes", JSON.stringify(updatedNotes));
    };

    const deleteExercise = async (id: string): Promise<void> => {
        if (!isLocalOnly && supabase && user && !id.startsWith("def")) {
            const { error } = await supabase.from("exercises").delete().eq("id", id);
            if (!error) {
                setDbExercises((prev) => prev.filter((ex) => ex.id !== id));
            }
        }

        if (localExercises.some((ex) => ex.id === id)) {
            const updated = localExercises.filter((ex) => ex.id !== id);
            setLocalExercises(updated);
            localStorage.setItem("dt_lift_local_exercises", JSON.stringify(updated));
        }

        const updatedDeleted = Array.from(new Set([...deletedExerciseIds, id]));
        setDeletedExerciseIds(updatedDeleted);
        localStorage.setItem("dt_lift_deleted_exercises", JSON.stringify(updatedDeleted));
    };

    // Template Operations
    const saveTemplate = async (
        name: string,
        description: string,
        exerciseList: {
            exercise_id: string;
            sets: SetTemplate[];
            rest_time_seconds?: number;
            substitute_exercise_ids?: string[];
        }[],
        templateId?: string,
    ): Promise<Template> => {
        const tempId = templateId || crypto.randomUUID();
        const newTemp: Template = {
            id: tempId,
            user_id: user?.id || "guest-uid",
            name,
            description,
            created_at: new Date().toISOString(),
            template_exercises: exerciseList.map((el, idx) => ({
                id: crypto.randomUUID(),
                template_id: tempId,
                exercise_id: el.exercise_id,
                sequence: idx,
                sets_json: el.sets,
                rest_time_seconds: el.rest_time_seconds || 60,
                substitute_exercise_ids: el.substitute_exercise_ids || [],
                exercise: exercises.find((ex) => ex.id === el.exercise_id),
                substitute_exercises: (el.substitute_exercise_ids || [])
                    .map((subId) => exercises.find((ex) => ex.id === subId))
                    .filter(Boolean) as Exercise[],
            })),
        };

        if (!isLocalOnly && supabase && user) {
            try {
                if (templateId) {
                    // Update existing template in Supabase
                    const { error: updateErr } = await supabase
                        .from("templates")
                        .update({ name, description })
                        .eq("id", templateId);

                    if (!updateErr) {
                        await supabase.from("template_exercises").delete().eq("template_id", templateId);
                        const insertExercises = exerciseList.map((el, idx) => ({
                            template_id: templateId,
                            exercise_id: el.exercise_id,
                            sequence: idx,
                            sets_json: el.sets,
                            rest_time_seconds: el.rest_time_seconds || 60,
                            substitute_exercise_ids: el.substitute_exercise_ids || [],
                        }));

                        await supabase.from("template_exercises").insert(insertExercises);
                        await fetchDbData(user.id);
                        return dbTemplates.find((t) => t.id === templateId) || newTemp;
                    }
                } else {
                    // Create new template in Supabase
                    const { data: tempRes, error: tempErr } = await supabase
                        .from("templates")
                        .insert({ name, description, user_id: user.id })
                        .select()
                        .single();

                    if (tempRes && !tempErr) {
                        const insertExercises = exerciseList.map((el, idx) => ({
                            template_id: tempRes.id,
                            exercise_id: el.exercise_id,
                            sequence: idx,
                            sets_json: el.sets,
                            rest_time_seconds: el.rest_time_seconds || 60,
                            substitute_exercise_ids: el.substitute_exercise_ids || [],
                        }));

                        const { error: exercisesErr } = await supabase
                            .from("template_exercises")
                            .insert(insertExercises);

                        if (!exercisesErr) {
                            await fetchDbData(user.id);
                            return dbTemplates.find((t) => t.id === tempRes.id) || newTemp;
                        }
                    }
                }
            } catch (e) {
                console.error("Error saving template in DB, falling back to local", e);
            }
        }

        // Local fallback
        let updated: Template[];
        if (templateId && localTemplates.some((t) => t.id === templateId)) {
            updated = localTemplates.map((t) => (t.id === templateId ? newTemp : t));
        } else {
            updated = [...localTemplates, newTemp];
        }
        setLocalTemplates(updated);
        localStorage.setItem("dt_lift_local_templates", JSON.stringify(updated));
        return newTemp;
    };

    const deleteTemplate = async (id: string): Promise<void> => {
        if (!isLocalOnly && supabase && user) {
            const { error } = await supabase.from("templates").delete().eq("id", id);
            if (!error) {
                setDbTemplates((prev) => prev.filter((t) => t.id !== id));
                return;
            }
        }

        // Local fallback
        const updated = localTemplates.filter((t) => t.id !== id);
        setLocalTemplates(updated);
        localStorage.setItem("dt_lift_local_templates", JSON.stringify(updated));
    };

    // Workout Operations
    const saveWorkout = async (
        name: string,
        startTime: string,
        endTime: string,
        notes: string,
        setsList: { exercise_id: string; weight: number; reps: number; is_warmup: boolean }[],
    ): Promise<Workout> => {
        const workId = crypto.randomUUID();
        const newWorkout: Workout = {
            id: workId,
            user_id: user?.id || "guest-uid",
            name,
            start_time: startTime,
            end_time: endTime,
            notes,
            created_at: new Date().toISOString(),
            workout_sets: setsList.map((s, idx) => ({
                id: crypto.randomUUID(),
                workout_id: workId,
                exercise_id: s.exercise_id,
                sequence: idx,
                weight: s.weight,
                reps: s.reps,
                is_warmup: s.is_warmup,
                completed: true,
                exercise: exercises.find((ex) => ex.id === s.exercise_id),
            })),
        };

        if (!isLocalOnly && supabase && user) {
            try {
                const { data: workRes, error: workErr } = await supabase
                    .from("workouts")
                    .insert({ name, start_time: startTime, end_time: endTime, notes, user_id: user.id })
                    .select()
                    .single();

                if (workRes && !workErr) {
                    const insertSets = setsList.map((s, idx) => ({
                        workout_id: workRes.id,
                        exercise_id: s.exercise_id,
                        sequence: idx,
                        weight: s.weight,
                        reps: s.reps,
                        is_warmup: s.is_warmup,
                        completed: true,
                    }));

                    const { error: setsErr } = await supabase.from("workout_sets").insert(insertSets);

                    if (!setsErr) {
                        await fetchDbData(user.id); // Refetch complete tree
                        return dbWorkouts.find((w) => w.id === workRes.id) || newWorkout;
                    }
                }
            } catch (e) {
                console.error("Error inserting workout in DB, falling back to local", e);
            }
        }

        // Local fallback
        const updated = [newWorkout, ...localWorkouts];
        setLocalWorkouts(updated);
        localStorage.setItem("dt_lift_local_workouts", JSON.stringify(updated));
        return newWorkout;
    };

    const deleteWorkout = async (id: string): Promise<void> => {
        if (!isLocalOnly && supabase && user) {
            const { error } = await supabase.from("workouts").delete().eq("id", id);
            if (!error) {
                setDbWorkouts((prev) => prev.filter((w) => w.id !== id));
                return;
            }
        }

        // Local fallback
        const updated = localWorkouts.filter((w) => w.id !== id);
        setLocalWorkouts(updated);
        localStorage.setItem("dt_lift_local_workouts", JSON.stringify(updated));
    };

    return (
        <DatabaseContext.Provider
            value={{
                user,
                isLoading,
                isLocalOnly,
                login,
                signup,
                logout,
                loginAsGuest,
                exercises,
                createExercise,
                updateExercise,
                deleteExercise,
                templates,
                saveTemplate,
                deleteTemplate,
                workouts,
                saveWorkout,
                deleteWorkout,
                lastPerformance,
                getLastPerformance,
                getLastPerformanceSets,
                personalRecords,
                getPersonalRecord,
                updateExerciseNotes,
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error("useDatabase must be used within a DatabaseProvider");
    }
    return context;
};
