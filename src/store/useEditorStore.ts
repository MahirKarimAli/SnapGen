import { create } from 'zustand'

export interface Asset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  url: string
  duration: number // in seconds (for video/audio)
  size: string
}

export interface TimelineClip {
  id: string
  assetId?: string
  name: string
  type: 'video' | 'audio' | 'text'
  track: number // 0: Video, 1: Audio, 2: Text/Subtitles
  start: number // start time in timeline (seconds)
  duration: number // duration in timeline (seconds)
  trimStart: number // source offset start (seconds)
  volume: number // 0 to 1
  text?: string // text content for text clips
}

interface EditorState {
  assets: Asset[]
  clips: TimelineClip[]
  currentTime: number
  maxDuration: number
  isPlaying: boolean
  selectedClipId: string | null
  aspectRatio: '16:9' | '9:16' | '1:1'
  isNoiseFilterActive: boolean
  toast: { message: string; type: 'success' | 'info' } | null
  
  // Actions
  addAsset: (asset: Asset) => void
  addClip: (clip: Omit<TimelineClip, 'id'>) => void
  deleteClip: (clipId: string) => void
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void
  selectClip: (clipId: string | null) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void
  setNoiseFilter: (active: boolean) => void
  showToast: (message: string, type?: 'success' | 'info') => void
  clearToast: () => void
  splitClip: (clipId: string, time: number) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  assets: [],
  clips: [],
  currentTime: 0,
  maxDuration: 60, // Default 60 seconds
  isPlaying: false,
  selectedClipId: null,
  aspectRatio: '16:9',
  isNoiseFilterActive: false,
  toast: null,

  addAsset: (asset) => set((state) => ({ 
    assets: [...state.assets, asset] 
  })),

  addClip: (clipData) => set((state) => {
    const id = `clip_${Math.random().toString(36).substr(2, 9)}`
    const newClip: TimelineClip = { ...clipData, id }
    const updatedClips = [...state.clips, newClip]
    
    // Dynamically increase max timeline duration if clip overflows
    const clipEnd = newClip.start + newClip.duration
    const newMaxDuration = Math.max(state.maxDuration, Math.ceil(clipEnd + 10))
    
    return {
      clips: updatedClips,
      maxDuration: newMaxDuration,
      selectedClipId: id
    }
  }),

  deleteClip: (clipId) => set((state) => ({
    clips: state.clips.filter((c) => c.id !== clipId),
    selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
  })),

  updateClip: (clipId, updates) => set((state) => {
    const updatedClips = state.clips.map((c) => {
      if (c.id === clipId) {
        const updated = { ...c, ...updates }
        // Keep bounds valid
        if (updated.start < 0) updated.start = 0
        if (updated.duration < 0.1) updated.duration = 0.1
        if (updated.trimStart < 0) updated.trimStart = 0
        return updated
      }
      return c
    })

    // Dynamically update max timeline duration
    let newMax = 60
    updatedClips.forEach(c => {
      if (c.start + c.duration > newMax) {
        newMax = Math.ceil(c.start + c.duration + 10)
      }
    })

    return { 
      clips: updatedClips,
      maxDuration: newMax
    }
  }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  setCurrentTime: (time) => set((state) => {
    let boundedTime = Math.max(0, time)
    if (boundedTime > state.maxDuration) boundedTime = state.maxDuration
    return { currentTime: boundedTime }
  }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  
  setNoiseFilter: (active) => set({ isNoiseFilterActive: active }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
  },

  clearToast: () => set({ toast: null }),

  splitClip: (clipId, time) => set((state) => {
    const clip = state.clips.find(c => c.id === clipId)
    if (!clip) return {}

    // Check if the split time falls within the clip's duration on the timeline
    const clipStart = clip.start
    const clipEnd = clip.start + clip.duration
    
    if (time <= clipStart || time >= clipEnd) {
      return {} // Split time is outside clip bounds
    }

    const firstDuration = time - clipStart
    const secondDuration = clip.duration - firstDuration
    
    // Create updates for the first half
    const firstHalfUpdated = {
      ...clip,
      duration: firstDuration
    }

    // Create the second half clip
    const secondHalfId = `clip_${Math.random().toString(36).substr(2, 9)}`
    const secondHalfClip: TimelineClip = {
      id: secondHalfId,
      assetId: clip.assetId,
      name: `${clip.name} (Part 2)`,
      type: clip.type,
      track: clip.track,
      start: time,
      duration: secondDuration,
      trimStart: clip.trimStart + firstDuration,
      volume: clip.volume,
      text: clip.text
    }

    const updatedClips = state.clips.map(c => c.id === clipId ? firstHalfUpdated : c)
    updatedClips.push(secondHalfClip)

    return {
      clips: updatedClips,
      selectedClipId: secondHalfId
    }
  })
}))
