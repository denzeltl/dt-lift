'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useDatabase, Exercise, Template, LastPerformance } from './DatabaseContext'

export interface LogSet {
  id: string
  weight: string // string for input binding
  reps: string   // string for input binding
  is_warmup: boolean
  completed: boolean
}

export interface LogExercise {
  exerciseId: string
  sets: LogSet[]
  exercise?: Exercise
  originalExerciseId?: string
  originalExercise?: Exercise
  lastPerformance?: LastPerformance | null
  rest_time_seconds?: number
  substitute_exercise_ids?: string[]
  substitute_exercises?: Exercise[]
}

export interface ActiveWorkout {
  name: string
  startTime: string
  exercises: LogExercise[]
  templateId?: string
}

interface RestTimerState {
  duration: number
  timeLeft: number
  isActive: boolean
}

interface WorkoutContextType {
  activeWorkout: ActiveWorkout | null
  workoutDuration: number
  restTimer: RestTimerState
  startWorkout: (template?: Template) => void
  addExerciseToWorkout: (exerciseId: string) => void
  removeExerciseFromWorkout: (exerciseIndex: number) => void
  addSetToExercise: (exerciseIndex: number) => void
  removeSetFromExercise: (exerciseIndex: number, setIndex: number) => void
  updateSet: (exerciseIndex: number, setIndex: number, fields: Partial<LogSet>) => void
  toggleSetCompleted: (exerciseIndex: number, setIndex: number) => void
  cancelWorkout: () => void
  finishWorkout: (notes: string) => Promise<void>
  swapExerciseInWorkout: (exerciseIndex: number, newExerciseId: string) => void
  addSubstituteToActiveExercise: (exerciseIndex: number, substituteExerciseId: string) => void
  startRestTimer: (duration: number) => void
  stopRestTimer: () => void
  adjustRestTimer: (seconds: number) => void
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

// Helper to play synthesized beep/chime offline via Web Audio API
const playChime = () => {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      
      gain.gain.setValueAtTime(0.15, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    
    const now = ctx.currentTime
    // Pleasant double-chime (C5, E5)
    playTone(523.25, now, 0.15)
    playTone(659.25, now + 0.12, 0.25)
  } catch (e) {
    console.error('Audio play failed', e)
  }
}

// Helper for phone vibration
const triggerVibration = () => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      // Vibrate pattern: 200ms, pause 100ms, vibrate 200ms
      navigator.vibrate([200, 100, 200])
    } catch (e) {
      console.warn('Vibration API not allowed or supported', e)
    }
  }
}

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { saveWorkout, saveTemplate, templates, exercises, getLastPerformance, getLastPerformanceSets } = useDatabase()
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null)
  const [workoutDuration, setWorkoutDuration] = useState<number>(0)
  const [restTimer, setRestTimer] = useState<RestTimerState>({
    duration: 90,
    timeLeft: 0,
    isActive: false
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const restTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Restore active workout from LocalStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('carry_lift_active_workout')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveWorkout
        // Re-attach exercise details if changed
        parsed.exercises = parsed.exercises.map(le => ({
          ...le,
          exercise: exercises.find(e => e.id === le.exerciseId),
          lastPerformance: getLastPerformance(le.exerciseId)
        }))
        setActiveWorkout(parsed)
        
        // Calculate duration based on saved start time
        const elapsed = Math.floor((Date.now() - new Date(parsed.startTime).getTime()) / 1000)
        setWorkoutDuration(elapsed > 0 ? elapsed : 0)
      } catch (e) {
        console.error('Failed to load active workout', e)
      }
    }

    const storedRest = localStorage.getItem('carry_lift_active_rest')
    if (storedRest) {
      try {
        const parsed = JSON.parse(storedRest)
        const elapsed = Math.floor((Date.now() - parsed.timestamp) / 1000)
        const timeLeft = parsed.timeLeft - elapsed
        if (timeLeft > 0) {
          setRestTimer({
            duration: parsed.duration,
            timeLeft: timeLeft,
            isActive: true
          })
        }
      } catch (e) {
        console.error('Failed to restore rest timer', e)
      }
    }
  }, [exercises])

  // 2. Active Workout Durations Clock
  useEffect(() => {
    if (activeWorkout) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeWorkout.startTime).getTime()) / 1000)
        setWorkoutDuration(elapsed > 0 ? elapsed : 0)
      }, 1000)
    } else {
      setWorkoutDuration(0)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeWorkout])

  // 3. Rest Timer Countdown
  useEffect(() => {
    if (restTimer.isActive && restTimer.timeLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev.timeLeft <= 1) {
            if (restTimerRef.current) clearInterval(restTimerRef.current)
            // Trigger alerts
            playChime()
            triggerVibration()
            localStorage.removeItem('carry_lift_active_rest')
            return { ...prev, timeLeft: 0, isActive: false }
          }
          
          // Save remaining rest timer state periodically
          const nextTimeLeft = prev.timeLeft - 1
          localStorage.setItem('carry_lift_active_rest', JSON.stringify({
            duration: prev.duration,
            timeLeft: nextTimeLeft,
            timestamp: Date.now()
          }))
          
          return { ...prev, timeLeft: nextTimeLeft }
        })
      }, 1000)
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current)
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current)
    }
  }, [restTimer.isActive, restTimer.timeLeft])

  // Save active workout to LocalStorage whenever it changes
  const saveWorkoutToLocalStorage = (workout: ActiveWorkout | null) => {
    if (workout) {
      localStorage.setItem('carry_lift_active_workout', JSON.stringify(workout))
    } else {
      localStorage.removeItem('carry_lift_active_workout')
    }
  }

  // Operations
  const startWorkout = (template?: Template) => {
    const workoutName = template ? template.name : 'Quick Workout'
    const newWorkout: ActiveWorkout = {
      name: workoutName,
      startTime: new Date().toISOString(),
      templateId: template?.id,
      exercises: template?.template_exercises?.map(te => {
        const last = getLastPerformance(te.exercise_id)
        return {
          exerciseId: te.exercise_id,
          exercise: te.exercise,
          originalExerciseId: te.exercise_id,
          originalExercise: te.exercise,
          lastPerformance: last,
          rest_time_seconds: te.rest_time_seconds,
          substitute_exercise_ids: te.substitute_exercise_ids,
          substitute_exercises: te.substitute_exercises || (te.substitute_exercise_ids || [])
            .map(id => exercises.find(e => e.id === id))
            .filter(Boolean) as Exercise[],
          sets: te.sets_json.map((s, idx) => ({
            id: `${te.id}-set-${idx}-${Date.now()}`,
            // Use per-set values from the template (kept in sync after each workout)
            weight: s.weight.toString(),
            reps: s.reps.toString(),
            is_warmup: s.is_warmup,
            completed: false
          }))
        }
      }) || []
    }
    setActiveWorkout(newWorkout)
    setWorkoutDuration(0)
    saveWorkoutToLocalStorage(newWorkout)
  }

  const addExerciseToWorkout = (exerciseId: string) => {
    if (!activeWorkout) return
    const exercise = exercises.find(e => e.id === exerciseId)
    const last = getLastPerformance(exerciseId)
    const lastSets = getLastPerformanceSets(exerciseId)

    const initialSets: LogSet[] = (lastSets && lastSets.length > 0)
      ? lastSets.map((s, idx) => ({
          id: `set-${Date.now()}-${idx}`,
          weight: s.weight ? s.weight.toString() : '',
          reps: s.reps ? s.reps.toString() : '',
          is_warmup: s.is_warmup,
          completed: false
        }))
      : [
          {
            id: `set-${Date.now()}-0`,
            weight: '',
            reps: '',
            is_warmup: false,
            completed: false
          }
        ]

    const newEx: LogExercise = {
      exerciseId,
      exercise,
      originalExerciseId: exerciseId,
      originalExercise: exercise,
      lastPerformance: last,
      sets: initialSets
    }
    const updated = {
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newEx]
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const removeExerciseFromWorkout = (exerciseIndex: number) => {
    if (!activeWorkout) return
    const updatedEx = activeWorkout.exercises.filter((_, idx) => idx !== exerciseIndex)
    const updated = {
      ...activeWorkout,
      exercises: updatedEx
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const addSetToExercise = (exerciseIndex: number) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    const sets = updatedExercises[exerciseIndex].sets
    
    // Autofill with previous set's values if present
    const lastSet = sets[sets.length - 1]
    const weight = lastSet ? lastSet.weight : ''
    const reps = lastSet ? lastSet.reps : ''
    
    sets.push({
      id: `set-${Date.now()}-${sets.length}`,
      weight,
      reps,
      is_warmup: false,
      completed: false
    })
    
    const updated = {
      ...activeWorkout,
      exercises: updatedExercises
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].sets = updatedExercises[exerciseIndex].sets.filter(
      (_, sIdx) => sIdx !== setIndex
    )
    const updated = {
      ...activeWorkout,
      exercises: updatedExercises
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, fields: Partial<LogSet>) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    updatedExercises[exerciseIndex].sets[setIndex] = {
      ...updatedExercises[exerciseIndex].sets[setIndex],
      ...fields
    }
    const updated = {
      ...activeWorkout,
      exercises: updatedExercises
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return
    const updatedExercises = [...activeWorkout.exercises]
    const set = updatedExercises[exerciseIndex].sets[setIndex]
    const nextCompletedState = !set.completed
    
    set.completed = nextCompletedState
    
    const updated = {
      ...activeWorkout,
      exercises: updatedExercises
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)

    // Trigger rest timer if set was completed (false -> true)
    if (nextCompletedState) {
      const restDuration = updatedExercises[exerciseIndex]?.rest_time_seconds || 90
      startRestTimer(restDuration)
    }
  }

  const cancelWorkout = () => {
    setActiveWorkout(null)
    setWorkoutDuration(0)
    saveWorkoutToLocalStorage(null)
    stopRestTimer()
  }

  const swapExerciseInWorkout = (exerciseIndex: number, newExerciseId: string) => {
    if (!activeWorkout) return
    const newEx = exercises.find(e => e.id === newExerciseId)
    const updatedExercises = [...activeWorkout.exercises]
    const target = updatedExercises[exerciseIndex]

    // Preserve the original exercise so the user can always revert back
    const originalExerciseId = target.originalExerciseId ?? target.exerciseId
    const originalExercise = target.originalExercise ?? target.exercise

    // Look up last performance for the target exercise
    const last = getLastPerformance(newExerciseId)
    const lastSets = getLastPerformanceSets(newExerciseId)

    let updatedSets: LogSet[] = []

    if (lastSets && lastSets.length > 0) {
      // Use exact per-set history from the last time this exercise was performed
      updatedSets = lastSets.map((s, idx) => ({
        id: `set-${Date.now()}-${idx}`,
        weight: s.weight ? s.weight.toString() : '',
        reps: s.reps ? s.reps.toString() : '',
        is_warmup: s.is_warmup,
        completed: false
      }))
    } else if (newExerciseId === originalExerciseId && activeWorkout.templateId) {
      // Reverting to original template exercise when no history exists
      const sourceTemplate = templates.find(t => t.id === activeWorkout.templateId)
      const originalTe = sourceTemplate?.template_exercises?.find(te => te.exercise_id === originalExerciseId)
      if (originalTe?.sets_json && originalTe.sets_json.length > 0) {
        updatedSets = originalTe.sets_json.map((s, idx) => ({
          id: `set-${Date.now()}-${idx}`,
          weight: s.weight ? s.weight.toString() : '',
          reps: s.reps ? s.reps.toString() : '',
          is_warmup: s.is_warmup,
          completed: false
        }))
      }
    }

    // Fallback if no historical or template sets exist
    if (updatedSets.length === 0) {
      updatedSets = target.sets.map(s => ({
        ...s,
        weight: '',
        reps: '',
        completed: false
      }))
    }

    updatedExercises[exerciseIndex] = {
      ...target,
      exerciseId: newExerciseId,
      exercise: newEx,
      originalExerciseId,
      originalExercise,
      lastPerformance: last,
      sets: updatedSets
    }

    const updated = {
      ...activeWorkout,
      exercises: updatedExercises
    }
    setActiveWorkout(updated)
    saveWorkoutToLocalStorage(updated)
  }

  const addSubstituteToActiveExercise = (exerciseIndex: number, substituteExerciseId: string) => {
    if (!activeWorkout) return
    const subEx = exercises.find(e => e.id === substituteExerciseId)
    if (!subEx) return

    const updatedExercises = [...activeWorkout.exercises]
    const target = updatedExercises[exerciseIndex]
    const currentSubIds = target.substitute_exercise_ids || []

    if (!currentSubIds.includes(substituteExerciseId)) {
      const newSubIds = [...currentSubIds, substituteExerciseId]
      const newSubObjs = [...(target.substitute_exercises || []), subEx]

      updatedExercises[exerciseIndex] = {
        ...target,
        substitute_exercise_ids: newSubIds,
        substitute_exercises: newSubObjs
      }

      const updated = {
        ...activeWorkout,
        exercises: updatedExercises
      }
      setActiveWorkout(updated)
      saveWorkoutToLocalStorage(updated)
    }
  }

  const finishWorkout = async (notes: string) => {
    if (!activeWorkout) return

    // Filter sets and structure data
    const finishedSets: { exercise_id: string; weight: number; reps: number; is_warmup: boolean }[] = []
    
    activeWorkout.exercises.forEach(le => {
      le.sets.forEach(s => {
        // Only save completed sets or if they entered data
        if (s.completed || (s.weight && s.reps)) {
          finishedSets.push({
            exercise_id: le.exerciseId,
            weight: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps, 10) || 0,
            is_warmup: s.is_warmup
          })
        }
      })
    })

    if (finishedSets.length > 0) {
      await saveWorkout(
        activeWorkout.name,
        activeWorkout.startTime,
        new Date().toISOString(),
        notes,
        finishedSets
      )
    }

    // Sync the source template with the changes made during this workout
    if (activeWorkout.templateId) {
      const sourceTemplate = templates.find(t => t.id === activeWorkout.templateId)
      if (sourceTemplate) {
        const updatedExerciseList = activeWorkout.exercises.map(le => {
          const wasSubstituted =
            le.originalExerciseId != null && le.exerciseId !== le.originalExerciseId

          // Find the original template exercise entry to preserve its metadata
          const originalTe = sourceTemplate.template_exercises?.find(
            te => te.exercise_id === (le.originalExerciseId ?? le.exerciseId)
          )

          // If this slot was a substitution, restore the original exercise in the template
          // so it appears unchanged on the next workout. The substitute's data is still
          // recorded in the workout history (lastPerformance) for future reference.
          if (wasSubstituted) {
            return {
              exercise_id: le.originalExerciseId!,
              sets: originalTe?.sets_json ?? [],
              rest_time_seconds: originalTe?.rest_time_seconds ?? le.rest_time_seconds ?? 60,
              substitute_exercise_ids: originalTe?.substitute_exercise_ids ?? le.substitute_exercise_ids ?? []
            }
          }

          // Build an updated sets_json from the actual sets logged this session
          const updatedSets = le.sets
            .filter(s => s.completed || (s.weight && s.reps))
            .map(s => ({
              weight: parseFloat(s.weight) || 0,
              reps: parseInt(s.reps, 10) || 0,
              is_warmup: s.is_warmup
            }))

          // Fall back to original sets if nothing was logged for this exercise
          const setsToSave =
            updatedSets.length > 0 ? updatedSets : (originalTe?.sets_json ?? [])

          return {
            exercise_id: le.exerciseId,
            sets: setsToSave,
            rest_time_seconds: originalTe?.rest_time_seconds ?? le.rest_time_seconds ?? 60,
            substitute_exercise_ids: originalTe?.substitute_exercise_ids ?? le.substitute_exercise_ids ?? []
          }
        })

        try {
          await saveTemplate(
            sourceTemplate.name,
            sourceTemplate.description ?? '',
            updatedExerciseList,
            activeWorkout.templateId
          )
        } catch (e) {
          console.error('Failed to sync template after workout', e)
        }
      }
    }

    setActiveWorkout(null)
    setWorkoutDuration(0)
    saveWorkoutToLocalStorage(null)
    stopRestTimer()
  }

  const startRestTimer = (duration: number) => {
    setRestTimer({
      duration,
      timeLeft: duration,
      isActive: true
    })
    
    localStorage.setItem('carry_lift_active_rest', JSON.stringify({
      duration,
      timeLeft: duration,
      timestamp: Date.now()
    }))
  }

  const stopRestTimer = () => {
    setRestTimer(prev => ({
      ...prev,
      timeLeft: 0,
      isActive: false
    }))
    localStorage.removeItem('carry_lift_active_rest')
    if (restTimerRef.current) clearInterval(restTimerRef.current)
  }

  const adjustRestTimer = (seconds: number) => {
    setRestTimer(prev => {
      if (!prev.isActive) return prev
      const nextTimeLeft = Math.max(0, prev.timeLeft + seconds)
      
      localStorage.setItem('carry_lift_active_rest', JSON.stringify({
        duration: prev.duration,
        timeLeft: nextTimeLeft,
        timestamp: Date.now()
      }))
      
      return {
        ...prev,
        timeLeft: nextTimeLeft
      }
    })
  }

  return (
    <WorkoutContext.Provider value={{
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
      addSubstituteToActiveExercise,
      startRestTimer,
      stopRestTimer,
      adjustRestTimer
    }}>
      {children}
    </WorkoutContext.Provider>
  )
}

export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}
