import React, { useRef, useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Volume2, Download, ShieldCheck } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'

export const Player: React.FC = () => {
  const {
    clips,
    assets,
    currentTime,
    isPlaying,
    maxDuration,
    aspectRatio,
    isNoiseFilterActive,
    setCurrentTime,
    setIsPlaying,
    showToast
  } = useEditorStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Audio context and filter node references for Voice Cleaner
  const audioCtxRef = useRef<AudioContext | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)
  
  // References to active media elements
  const mediaElementsRef = useRef<{ [clipId: string]: HTMLMediaElement }>({})
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Determine aspect ratio canvas dimensions
  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case '9:16': return { width: 1080, height: 1920 }
      case '1:1': return { width: 1080, height: 1080 }
      case '16:9':
      default: return { width: 1920, height: 1080 }
    }
  }

  const { width, height } = getCanvasDimensions()

  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Highpass filter for Voice Cleaner
      const filter = audioCtxRef.current.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = 150 // cut out rumble/noise below 150Hz
      filter.Q.value = 1
      
      filter.connect(audioCtxRef.current.destination)
      filterNodeRef.current = filter
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }

  // Create or sync media elements for all clips on timeline
  useEffect(() => {
    clips.forEach((clip) => {
      if (clip.assetId && !mediaElementsRef.current[clip.id]) {
        const asset = assets.find((a) => a.id === clip.assetId)
        if (!asset) return

        let el: HTMLMediaElement
        if (clip.type === 'video') {
          el = document.createElement('video')
          el.crossOrigin = 'anonymous'
          // Mute video element to route audio through canvas/web audio if needed
          el.muted = false 
        } else if (clip.type === 'audio') {
          el = document.createElement('audio')
          el.crossOrigin = 'anonymous'
        } else {
          return // text clips don't need media elements
        }

        el.src = asset.url
        el.load()
        mediaElementsRef.current[clip.id] = el
      }
    })

    // Clean up deleted clips media elements
    Object.keys(mediaElementsRef.current).forEach((clipId) => {
      if (!clips.some((c) => c.id === clipId)) {
        mediaElementsRef.current[clipId].pause()
        delete mediaElementsRef.current[clipId]
      }
    })
  }, [clips, assets])

  // Noise filter dynamic configuration
  useEffect(() => {
    // If filter is active and we have audio context, route elements through filter
    if (isNoiseFilterActive && audioCtxRef.current && filterNodeRef.current) {
      Object.keys(mediaElementsRef.current).forEach((clipId) => {
        const el = mediaElementsRef.current[clipId]
        try {
          // Wrap media element into audio node
          const source = audioCtxRef.current!.createMediaElementSource(el)
          source.connect(filterNodeRef.current!)
        } catch (e) {
          // Already connected error is safe to ignore
        }
      })
    }
  }, [isNoiseFilterActive])

  // Sync playback state and times
  useEffect(() => {
    clips.forEach((clip) => {
      const el = mediaElementsRef.current[clip.id]
      if (!el) return

      const clipStart = clip.start
      const clipEnd = clip.start + clip.duration

      if (currentTime >= clipStart && currentTime <= clipEnd) {
        const relativeTime = (currentTime - clipStart) + clip.trimStart
        
        // Sync time if drift is > 0.3s
        if (Math.abs(el.currentTime - relativeTime) > 0.3) {
          el.currentTime = relativeTime
        }

        // Handle Play / Pause
        if (isPlaying && el.paused) {
          el.play().catch(() => {})
        } else if (!isPlaying && !el.paused) {
          el.pause()
        }
      } else {
        if (!el.paused) {
          el.pause()
        }
      }
    })
  }, [isPlaying, currentTime, clips])

  // Playback timer loop (advances currentTime when isPlaying is true)
  useEffect(() => {
    if (!isPlaying) return

    let lastTime = performance.now()
    let animationFrameId: number

    const tick = () => {
      const now = performance.now()
      const elapsed = (now - lastTime) / 1000 // elapsed seconds
      lastTime = now

      // Read directly from store to avoid depending on currentTime
      const currentStoreTime = useEditorStore.getState().currentTime
      const nextTime = currentStoreTime + elapsed

      if (nextTime >= maxDuration) {
        setCurrentTime(0)
        setIsPlaying(false)
      } else {
        setCurrentTime(nextTime)
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, maxDuration, setCurrentTime, setIsPlaying])

  // Canvas drawing effect (strictly for rendering based on current state)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear Canvas
    ctx.fillStyle = '#0f1015'
    ctx.fillRect(0, 0, width, height)

    // 1. Render Video / Graphics layers
    const activeVideoClips = clips
      .filter((c) => c.type === 'video' && currentTime >= c.start && currentTime <= c.start + c.duration)
      // Sort by track layer if multiple videos overlap (higher track = overlays)
      .sort((a, b) => a.track - b.track)

    activeVideoClips.forEach((clip) => {
      const el = mediaElementsRef.current[clip.id]
      if (el && el.readyState >= 2) {
        ctx.drawImage(el as HTMLVideoElement, 0, 0, width, height)
      }
    })

    // 2. Render Text / Subtitle layers
    const activeTextClips = clips.filter(
      (c) => c.type === 'text' && currentTime >= c.start && currentTime <= c.start + c.duration
    )

    activeTextClips.forEach((clip) => {
      if (!clip.text) return
      
      // Draw subtitle background box
      ctx.font = 'bold 44px Outfit, Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      
      const textWidth = ctx.measureText(clip.text).width
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      ctx.fillRect(
        width / 2 - textWidth / 2 - 20, 
        height - 180, 
        textWidth + 40, 
        70
      )
      
      // Draw subtitle text
      ctx.fillStyle = '#ffffff'
      ctx.fillText(clip.text, width / 2, height - 128)
    })

    // Draw grid line overlay helper or watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.font = '14px JetBrains Mono'
    ctx.textAlign = 'left'
    ctx.fillText(`PREVIEW MODE: ${aspectRatio} | ${width}x${height}`, 24, 40)
  }, [clips, currentTime, width, height, aspectRatio])

  // Handle Play Pause click
  const togglePlay = () => {
    initAudio()
    setIsPlaying(!isPlaying)
  }

  // Handle Rewind to start
  const handleRewind = () => {
    setCurrentTime(0)
    clips.forEach(c => {
      const el = mediaElementsRef.current[c.id]
      if (el) el.currentTime = c.trimStart
    })
  }

  // Time format helper
  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    const ms = Math.floor((time % 1) * 100)
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms < 10 ? '0' : ''}${ms}`
  }

  // Client-Side Canvas MediaRecorder Export Engine
  const startExport = () => {
    initAudio()
    const canvas = canvasRef.current
    if (!canvas) return

    setExportBlobUrl(null)
    setExportProgress(0)
    setIsPlaying(false)
    setCurrentTime(0)
    showToast('Preparing project for export...', 'info')

    // Capture visual stream at 30 FPS
    const stream = canvas.captureStream(30)
    
    // Mix audio context destination node stream if available
    if (audioCtxRef.current) {
      try {
        const audioDest = audioCtxRef.current.createMediaStreamDestination()
        
        // Connect media elements to destination node
        Object.keys(mediaElementsRef.current).forEach((clipId) => {
          const el = mediaElementsRef.current[clipId]
          const source = audioCtxRef.current!.createMediaElementSource(el)
          source.connect(audioDest)
        })
        
        const audioTracks = audioDest.stream.getAudioTracks()
        if (audioTracks.length > 0) {
          stream.addTrack(audioTracks[0])
        }
      } catch (e) {
        console.warn('Audio capture routing warning (already routed):', e)
      }
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setExportBlobUrl(url)
      setExportProgress(100)
      showToast('Video export completed successfully!', 'success')
    }

    // Set timeline to 0 and play to end
    setIsPlaying(true)
    recorder.start()

    // Export progress monitor loop
    const progressInterval = setInterval(() => {
      const time = useEditorStore.getState().currentTime
      const progress = Math.min(Math.round((time / maxDuration) * 100), 99)
      setExportProgress(progress)

      if (time >= maxDuration - 0.1 || !useEditorStore.getState().isPlaying) {
        clearInterval(progressInterval)
        recorder.stop()
        setIsPlaying(false)
      }
    }, 200)
  }

  return (
    <div className="player-panel">
      {/* Exporter Modal */}
      {exportProgress !== null && (
        <div className="export-modal-backdrop">
          <div className="export-modal">
            <h3 className="export-title">Exporting SnapGen Project</h3>
            <div className="export-progress-container">
              <div className="export-status-text">
                <span>{exportProgress < 100 ? 'Rendering video frames...' : 'Render Complete!'}</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="export-progress-bar">
                <div className="export-progress-fill" style={{ width: `${exportProgress}%` }}></div>
              </div>
            </div>

            {exportProgress < 100 ? (
              <button 
                className="upload-btn" 
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'none' }}
                onClick={() => {
                  mediaRecorderRef.current?.stop()
                  setExportProgress(null)
                  setIsPlaying(false)
                  showToast('Export cancelled', 'info')
                }}
              >
                Cancel Export
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <a 
                  href={exportBlobUrl || '#'} 
                  download="snapgen_export.webm" 
                  className="export-download-btn"
                >
                  <Download size={16} /> Download WebM Video
                </a>
                <button 
                  className="timeline-btn" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setExportProgress(null)}
                >
                  Dismiss Panel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Viewport Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="player-canvas"
          style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1' }}
        ></canvas>
      </div>

      {/* Control Overlay Bar */}
      <div className="player-controls-container">
        <div 
          className="player-progress-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const percent = clickX / rect.width
            setCurrentTime(percent * maxDuration)
          }}
        >
          <div className="player-progress-fill" style={{ width: `${(currentTime / maxDuration) * 100}%` }}>
            <div className="player-progress-handle"></div>
          </div>
        </div>

        <div className="player-controls">
          <div className="timecode">
            <span className="timecode-current">{formatTime(currentTime)}</span>
            <span style={{ margin: '0 4px' }}>/</span>
            <span>{formatTime(maxDuration)}</span>
          </div>

          <div className="control-btns">
            <button className="player-btn" onClick={handleRewind} title="Rewind">
              <RotateCcw size={16} />
            </button>
            <button className="play-pause-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button className="player-btn" onClick={startExport} title="Export WebM Video">
              <Download size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isNoiseFilterActive && (
              <span 
                className="ai-toggle-label pulse" 
                style={{ color: 'var(--success)', fontSize: '11px', gap: '4px' }}
              >
                <ShieldCheck size={12} /> Cleaner Active
              </span>
            )}
            <button className="player-btn" title="Toggle Volume">
              <Volume2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
