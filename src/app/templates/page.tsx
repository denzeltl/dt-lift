'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDatabase, Template, Exercise, SetTemplate } from '@/context/DatabaseContext'
import { useWorkout } from '@/context/WorkoutContext'
import { ClipboardList, Plus, Trash2, X, Search, Check, Play, Edit3, Pencil, Timer, RefreshCw, Scale } from 'lucide-react'

export default function Templates() {
  const { user, templates, exercises, saveTemplate, deleteTemplate, isLoading } = useDatabase()
  const { startWorkout, activeWorkout } = useWorkout()
  const router = useRouter()

  // State for Template Editor
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')

  const [editorExercises, setEditorExercises] = useState<{
    exerciseId: string
    sets: SetTemplate[]
    restTimeSeconds: number
    substituteExerciseIds: string[]
  }[]>([])

  // State for Exercise Picker Modal
  const [showPicker, setShowPicker] = useState(false)
  const [pickingSubstituteForIndex, setPickingSubstituteForIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // State for Delete Confirmation Modal
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null)

  // Redirect to login if user not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-3">
        <ClipboardList className="h-10 w-10 animate-bounce text-lime-400" />
        <p className="text-sm font-semibold text-zinc-400 font-mono">Loading Templates...</p>
      </div>
    )
  }

  // Categories list
  const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio']

  // Filtered exercises for picker
  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory === 'All' || ex.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const handleStartTemplate = (template: Template) => {
    if (activeWorkout) {
      if (!confirm('You already have an active workout session in progress. Starting this template will cancel your current session. Do you want to proceed?')) {
        return
      }
    }
    startWorkout(template)
    router.push('/workout')
  }

  const handleStartEmptyWorkout = () => {
    if (activeWorkout) {
      router.push('/workout')
      return
    }
    startWorkout()
    router.push('/workout')
  }

  // Editor actions
  const openCreator = () => {
    setEditingTemplateId(null)
    setTemplateName('')
    setTemplateDesc('')
    setEditorExercises([])
    setIsEditing(true)
  }

  const openEditorForTemplate = (t: Template) => {
    setEditingTemplateId(t.id)
    setTemplateName(t.name)
    setTemplateDesc(t.description || '')
    setEditorExercises(
      t.template_exercises?.map(te => ({
        exerciseId: te.exercise_id,
        sets: te.sets_json || [{ weight: 0, reps: 10, is_warmup: false }],
        restTimeSeconds: te.rest_time_seconds || 60,
        substituteExerciseIds: te.substitute_exercise_ids || []
      })) || []
    )
    setIsEditing(true)
  }

  const handleSelectExerciseInPicker = (exId: string) => {
    if (pickingSubstituteForIndex !== null) {
      // Add as substitute exercise to the specified exercise
      const exIdx = pickingSubstituteForIndex
      setEditorExercises(prev => {
        const updated = [...prev]
        const currentSubIds = updated[exIdx].substituteExerciseIds || []
        if (!currentSubIds.includes(exId)) {
          updated[exIdx].substituteExerciseIds = [...currentSubIds, exId]
        }
        return updated
      })
      setPickingSubstituteForIndex(null)
    } else {
      // Add as primary exercise
      setEditorExercises(prev => [
        ...prev,
        {
          exerciseId: exId,
          sets: [{ weight: 0, reps: 10, is_warmup: false }],
          restTimeSeconds: 60,
          substituteExerciseIds: []
        }
      ])
    }
    setShowPicker(false)
  }

  const removeExerciseFromEditor = (idx: number) => {
    setEditorExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const updateExerciseRestTimeInEditor = (exIdx: number, restTimeSeconds: number) => {
    setEditorExercises(prev => {
      const updated = [...prev]
      updated[exIdx].restTimeSeconds = restTimeSeconds
      return updated
    })
  }

  const removeSubstituteFromExercise = (exIdx: number, subId: string) => {
    setEditorExercises(prev => {
      const updated = [...prev]
      updated[exIdx].substituteExerciseIds = updated[exIdx].substituteExerciseIds.filter(id => id !== subId)
      return updated
    })
  }

  const addSetToEditorExercise = (exIdx: number) => {
    setEditorExercises(prev => {
      const updated = [...prev]
      const sets = updated[exIdx].sets
      const lastSet = sets[sets.length - 1]
      sets.push({
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 10,
        is_warmup: false
      })
      return updated
    })
  }

  const removeSetFromEditorExercise = (exIdx: number, setIdx: number) => {
    setEditorExercises(prev => {
      const updated = [...prev]
      updated[exIdx].sets = updated[exIdx].sets.filter((_, i) => i !== setIdx)
      return updated
    })
  }

  const updateSetInEditor = (exIdx: number, setIdx: number, fields: Partial<SetTemplate>) => {
    setEditorExercises(prev => {
      const updated = [...prev]
      updated[exIdx].sets[setIdx] = {
        ...updated[exIdx].sets[setIdx],
        ...fields
      }
      return updated
    })
  }

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Template Name is required')
      return
    }
    if (editorExercises.length === 0) {
      alert('Add at least one exercise to the template')
      return
    }

    await saveTemplate(
      templateName.trim(),
      templateDesc.trim(),
      editorExercises.map(ee => ({
        exercise_id: ee.exerciseId,
        sets: ee.sets,
        rest_time_seconds: ee.restTimeSeconds,
        substitute_exercise_ids: ee.substituteExerciseIds
      })),
      editingTemplateId || undefined
    )
    setIsEditing(false)
  }

  const handleConfirmDeleteTemplate = async () => {
    if (!deletingTemplate) return
    await deleteTemplate(deletingTemplate.id)
    setDeletingTemplate(null)
  }

  // Weight conversion helpers
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10
  const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center space-x-2">
            <ClipboardList className="h-6 w-6 text-lime-400" />
            <span>Templates</span>
          </h1>
          <p className="text-xs text-zinc-400 font-medium">Create routines or start a quick workout.</p>
        </div>
        <button
          onClick={openCreator}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-black shadow-md hover:bg-lime-300 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Quick Start Buttons */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-4 space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quick Start</h3>
        <button
          onClick={handleStartEmptyWorkout}
          className="w-full flex items-center justify-between rounded-xl bg-lime-500/10 border border-lime-500/20 px-4 py-3.5 text-left text-sm font-extrabold text-lime-400 hover:bg-lime-500/15 active:scale-[0.99] transition-all"
        >
          <span>Start an Empty Workout</span>
          <Play className="h-4 w-4 fill-lime-400" />
        </button>
      </div>

      {/* Routine Templates list */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">My Templates ({templates.length})</h3>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-8 text-center text-zinc-500 space-y-2">
            <ClipboardList className="h-8 w-8 text-zinc-700 mx-auto" />
            <p className="text-sm font-semibold">No workout templates created</p>
            <p className="text-xs text-zinc-600">Click the + button to build your first template routine.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {templates.map(t => {
              return (
                <div 
                  key={t.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5 flex-1 pr-3">
                      <h4 className="text-sm font-extrabold text-zinc-200">{t.name}</h4>
                      {t.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1">{t.description}</p>
                      )}
                      
                      {/* Exercises breakdown */}
                      <div className="space-y-1.5 pt-1">
                        {t.template_exercises?.map((te, idx) => {
                          const subListStr = te.substitute_exercises?.map(s => s.name).join(', ')
                          return (
                            <div key={idx} className="text-[11px] text-zinc-400 space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-zinc-300">• {te.exercise?.name || 'Exercise'}</span>
                                {te.rest_time_seconds && (
                                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-mono text-lime-400 font-bold">
                                    ⏱️ {te.rest_time_seconds}s
                                  </span>
                                )}
                              </div>
                              {subListStr && (
                                <p className="text-[10px] text-zinc-500 italic pl-3">
                                  Substitutes: <span className="text-zinc-400">{subListStr}</span>
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditorForTemplate(t)}
                        title="Edit template"
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-lime-400 active:scale-95 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTemplate(t)}
                        title="Delete template"
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 active:scale-95 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartTemplate(t)}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white active:scale-[0.98] transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Routine</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FULL SCREEN TEMPLATE CREATOR / EDITOR */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 p-4 overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
            <h2 className="text-lg font-black text-zinc-100 flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-lime-400" />
              <span>{editingTemplateId ? 'Edit Template' : 'Create Template'}</span>
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-transform"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 py-4 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Template Name</label>
              <input
                type="text"
                placeholder="e.g. Upper Body Power"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description (Optional)</label>
              <textarea
                placeholder="e.g. Focus on chest, shoulders, and triceps volume."
                value={templateDesc}
                onChange={e => setTemplateDesc(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Template Exercises Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Exercises ({editorExercises.length})</h3>
                
                <div className="flex items-center space-x-2">
                  {/* KG / LBS Unit Switcher */}
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${
                        weightUnit === 'kg' ? 'bg-lime-400 text-black shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      KG
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${
                        weightUnit === 'lbs' ? 'bg-lime-400 text-black shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      LBS
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setPickingSubstituteForIndex(null)
                      setShowPicker(true)
                    }}
                    className="flex items-center space-x-1 rounded-lg bg-lime-500/10 border border-lime-500/20 px-3 py-1.5 text-xs font-bold text-lime-400 hover:bg-lime-500/15"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Exercise</span>
                  </button>
                </div>
              </div>

              {editorExercises.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-xs italic">
                  No exercises added yet. Click &ldquo;Add Exercise&rdquo; to build your routine.
                </div>
              ) : (
                <div className="space-y-5">
                  {editorExercises.map((ee, exIdx) => {
                    const exerciseInfo = exercises.find(ex => ex.id === ee.exerciseId)
                    return (
                      <div 
                        key={exIdx}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4"
                      >
                        {/* Exercise Header & Rest Timer Setting */}
                        <div className="flex items-start justify-between border-b border-zinc-850 pb-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-lime-400">{exerciseInfo?.name}</h4>
                            <span className="rounded bg-zinc-850 px-2 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                              {exerciseInfo?.category}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3">
                            {/* Rest Time Selector */}
                            <div className="flex items-center space-x-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
                              <Timer className="h-3.5 w-3.5 text-lime-400" />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">Rest:</span>
                              <select
                                value={ee.restTimeSeconds}
                                onChange={e => updateExerciseRestTimeInEditor(exIdx, parseInt(e.target.value, 10))}
                                className="bg-transparent text-xs text-lime-400 font-mono font-bold focus:outline-none cursor-pointer"
                              >
                                <option value={30} className="bg-zinc-950 text-zinc-200">30s</option>
                                <option value={45} className="bg-zinc-950 text-zinc-200">45s</option>
                                <option value={60} className="bg-zinc-950 text-zinc-200">60s (1m)</option>
                                <option value={90} className="bg-zinc-950 text-zinc-200">90s (1.5m)</option>
                                <option value={120} className="bg-zinc-950 text-zinc-200">120s (2m)</option>
                                <option value={150} className="bg-zinc-950 text-zinc-200">150s (2.5m)</option>
                                <option value={180} className="bg-zinc-950 text-zinc-200">180s (3m)</option>
                                <option value={240} className="bg-zinc-950 text-zinc-200">240s (4m)</option>
                                <option value={300} className="bg-zinc-950 text-zinc-200">300s (5m)</option>
                              </select>
                            </div>

                            <button
                              onClick={() => removeExerciseFromEditor(exIdx)}
                              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sets Editor Table */}
                        <div className="space-y-2">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-2 text-center text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                            <span className="col-span-2 text-left">Set</span>
                            <span className="col-span-3">Weight ({weightUnit.toUpperCase()})</span>
                            <span className="col-span-3">Reps</span>
                            <span className="col-span-2">Warmup</span>
                            <span className="col-span-2"></span>
                          </div>

                          {/* Sets Rows */}
                          {ee.sets.map((set, setIdx) => {
                            const displayWeightValue = weightUnit === 'lbs'
                              ? (set.weight ? kgToLbs(set.weight) : '')
                              : (set.weight || '')

                            const conversionText = weightUnit === 'lbs'
                              ? `${set.weight || 0} kg`
                              : `${kgToLbs(set.weight || 0)} lbs`

                            return (
                              <div key={setIdx} className="grid grid-cols-12 gap-2 items-center text-center">
                                <span className="col-span-2 text-left text-xs font-bold text-zinc-400 font-mono">{setIdx + 1}</span>
                                
                                <div className="col-span-3 flex flex-col items-center">
                                  <input
                                    type="number"
                                    value={displayWeightValue}
                                    placeholder="0"
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0
                                      const storedKg = weightUnit === 'lbs' ? lbsToKg(val) : val
                                      updateSetInEditor(exIdx, setIdx, { weight: storedKg })
                                    }}
                                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 py-1 text-center text-xs text-zinc-100 focus:border-lime-500/50 focus:outline-none font-mono"
                                  />
                                  <span className="text-[8px] text-zinc-500 font-mono mt-0.5">
                                    {conversionText}
                                  </span>
                                </div>

                                <div className="col-span-3 flex flex-col items-center">
                                  <input
                                    type="number"
                                    value={set.reps || ''}
                                    placeholder="0"
                                    onChange={e => updateSetInEditor(exIdx, setIdx, { reps: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 py-1 text-center text-xs text-zinc-100 focus:border-lime-500/50 focus:outline-none font-mono"
                                  />
                                </div>

                                <div className="col-span-2 flex justify-center">
                                  <input
                                    type="checkbox"
                                    checked={set.is_warmup}
                                    onChange={e => updateSetInEditor(exIdx, setIdx, { is_warmup: e.target.checked })}
                                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-lime-500 focus:ring-0 cursor-pointer"
                                  />
                                </div>

                                <div className="col-span-2 flex justify-end">
                                  <button
                                    onClick={() => removeSetFromEditorExercise(exIdx, setIdx)}
                                    disabled={ee.sets.length <= 1}
                                    className="rounded-lg p-1 text-zinc-600 hover:text-red-400 disabled:opacity-30 disabled:hover:text-zinc-600 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => addSetToEditorExercise(exIdx)}
                          className="w-full flex items-center justify-center space-x-1 rounded-lg border border-dashed border-zinc-800 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Set</span>
                        </button>

                        {/* Substitute Exercises Section */}
                        <div className="rounded-lg bg-zinc-950/70 border border-zinc-850 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              <RefreshCw className="h-3.5 w-3.5 text-lime-400" />
                              <span>Substitute Exercises ({ee.substituteExerciseIds.length})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPickingSubstituteForIndex(exIdx)
                                setShowPicker(true)
                              }}
                              className="flex items-center space-x-1 rounded bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 text-[10px] font-bold text-lime-400 hover:bg-lime-500/20 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Substitute</span>
                            </button>
                          </div>

                          {ee.substituteExerciseIds.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic">No substitute exercises selected for this exercise.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ee.substituteExerciseIds.map(subId => {
                                const subEx = exercises.find(ex => ex.id === subId)
                                return (
                                  <div key={subId} className="flex items-center space-x-1.5 rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-200 font-medium">
                                    <span className="text-lime-400 font-semibold">{subEx?.name || subId}</span>
                                    <span className="text-[9px] text-zinc-500 font-bold uppercase">({subEx?.category})</span>
                                    <button
                                      type="button"
                                      onClick={() => removeSubstituteFromExercise(exIdx, subId)}
                                      className="text-zinc-500 hover:text-red-400 transition-colors ml-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="pt-4 border-t border-zinc-900 bg-zinc-950 mt-4 flex space-x-3">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/30 py-3.5 text-sm font-bold text-zinc-300 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              className="flex-1 rounded-xl bg-lime-400 py-3.5 text-sm font-extrabold text-black hover:bg-lime-300 active:scale-[0.98] transition-all"
            >
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* EXERCISE SELECTOR MODAL (Inside Creator) */}
      {showPicker && (
        <div className="fixed inset-0 z-65 flex flex-col bg-zinc-950 p-4 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
            <h3 className="text-md font-bold text-zinc-100">
              {pickingSubstituteForIndex !== null ? 'Select Substitute Exercise' : 'Select Exercise'}
            </h3>
            <button
              onClick={() => {
                setShowPicker(false)
                setPickingSubstituteForIndex(null)
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
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-lime-500/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Muscle category filter tabs */}
          <div className="flex space-x-1.5 overflow-x-auto py-3 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-lime-400 text-black' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exercises list */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {filteredExercises.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-8">No matching exercises found.</p>
            ) : (
              filteredExercises.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectExerciseInPicker(ex.id)}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/20 p-3.5 hover:bg-zinc-900/40 cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">{ex.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-semibold">{ex.category}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-850 p-1.5 text-zinc-500 hover:text-lime-400">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-850 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="rounded-full bg-red-500/10 p-3 border border-red-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-100">Delete Template</h3>
                <p className="text-xs text-zinc-400">This routine will be removed.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300">
              Are you sure you want to delete <span className="font-bold text-lime-400">{deletingTemplate.name}</span>?
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTemplate}
                className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500 active:scale-[0.98] transition-all shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

