import React, { useRef, useState, useEffect } from 'react'
import { Scissors, Trash2, ZoomIn, ZoomOut, Film, Music, Type } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import type { TimelineClip } from '../store/useEditorStore'

export const Timeline: React.FC = () => {
  const {
    clips,
    currentTime,
    maxDuration,
    selectedClipId,
    setCurrentTime,
    deleteClip,
    updateClip,
    selectClip,
    splitClip,
    showToast
  } = useEditorStore()

  const [pxPerSecond, setPxPerSecond] = useState(10) // Zoom level: 10px = 1s
  const rulerRef = useRef<HTMLDivElement>(null)
  const tracksContentRef = useRef<HTMLDivElement>(null)

  // Dragging states for clip movement and trimming
  const [dragAction, setDragAction] = useState<{
    clipId: string
    type: 'move' | 'trim-start' | 'trim-end'
    initialMouseX: number
    initialStart: number
    initialDuration: number
    initialTrimStart: number
  } | null>(null)

  // Track types and icons
  const tracks = [
    { id: 0, name: 'Video & Overlays', type: 'video', icon: <Film size={14} /> },
    { id: 1, name: 'Audio Tracks', type: 'audio', icon: <Music size={14} /> },
    { id: 2, name: 'AI Subtitles & Text', type: 'text', icon: <Type size={14} /> }
  ]

  // Click on ruler to seek playhead
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left + rulerRef.current.scrollLeft
    const newTime = (clickX - 140) / pxPerSecond
    setCurrentTime(Math.max(0, Math.min(newTime, maxDuration)))
  }

  // Handle Drag Over / Drop from Asset Library
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent, trackId: number) => {
    e.preventDefault()
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) return
      
      const payload = JSON.parse(dataStr)
      const rect = e.currentTarget.getBoundingClientRect()
      const dropX = e.clientX - rect.left
      const dropTime = Math.max(0, dropX / pxPerSecond)

      // Add the clip to the editor store
      useEditorStore.getState().addClip({
        assetId: payload.assetId,
        name: payload.name,
        type: payload.type,
        track: trackId,
        start: dropTime,
        duration: payload.duration,
        trimStart: 0,
        volume: 1
      })
      showToast(`Dropped ${payload.name} onto timeline`, 'success')
    } catch (err) {
      console.error('Drop error:', err)
    }
  }

  // Mouse drag handlers for clips (move/trim)
  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: TimelineClip,
    actionType: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation()
    selectClip(clip.id)
    setDragAction({
      clipId: clip.id,
      type: actionType,
      initialMouseX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      initialTrimStart: clip.trimStart
    })
  }

  // Global mousemove/mouseup listener for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragAction) return
      const deltaX = e.clientX - dragAction.initialMouseX
      const deltaTime = deltaX / pxPerSecond

      if (dragAction.type === 'move') {
        const newStart = Math.max(0, dragAction.initialStart + deltaTime)
        updateClip(dragAction.clipId, { start: newStart })
      } else if (dragAction.type === 'trim-start') {
        const newStart = Math.max(0, dragAction.initialStart + deltaTime)
        const diff = newStart - dragAction.initialStart
        const newDuration = Math.max(0.1, dragAction.initialDuration - diff)
        const newTrimStart = Math.max(0, dragAction.initialTrimStart + diff)
        
        // Ensure trim start offset doesn't exceed clip boundaries
        updateClip(dragAction.clipId, {
          start: newStart,
          duration: newDuration,
          trimStart: newTrimStart
        })
      } else if (dragAction.type === 'trim-end') {
        const newDuration = Math.max(0.1, dragAction.initialDuration + deltaTime)
        updateClip(dragAction.clipId, { duration: newDuration })
      }
    }

    const handleMouseUp = () => {
      if (dragAction) {
        setDragAction(null)
      }
    }

    if (dragAction) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragAction, pxPerSecond, updateClip])

  // Keypress listener for delete selected clip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedClipId && (e.key === 'Delete' || e.key === 'Backspace')) {
        // Block delete if typing in input/textarea (like AI scripting)
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return
        deleteClip(selectedClipId)
        showToast('Clip deleted', 'info')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, deleteClip, showToast])

  // Split selected clip
  const handleSplitSelected = () => {
    if (!selectedClipId) {
      showToast('Select a clip first to split', 'info')
      return
    }
    splitClip(selectedClipId, currentTime)
    showToast('Clip split successfully', 'success')
  }

  // Zoom options
  const zoomIn = () => setPxPerSecond(prev => Math.min(prev + 2, 40))
  const zoomOut = () => setPxPerSecond(prev => Math.max(prev - 2, 4))

  // Render ticks on timeline ruler
  const renderRulerTicks = () => {
    const ticks = []
    
    // Add visual header cover in the ruler for track header alignment
    ticks.push(
      <div
        key="header-spacer"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '140px',
          height: '100%',
          backgroundColor: 'var(--bg-tertiary)',
          borderRight: '1px solid var(--border-color)',
          zIndex: 3
        }}
      ></div>
    )

    const totalSeconds = Math.max(maxDuration, 120) // show up to max duration
    
    // Draw tick marks every 1s, and text every 5s
    for (let s = 0; s < totalSeconds; s++) {
      const positionLeft = 140 + s * pxPerSecond
      const isMajor = s % 5 === 0
      
      ticks.push(
        <div
          key={s}
          className={`ruler-tick ${isMajor ? 'major' : ''}`}
          style={{ left: `${positionLeft}px` }}
        >
          {isMajor && (
            <span className="ruler-time">{s}s</span>
          )}
        </div>
      )
    }
    return ticks
  }

  return (
    <div className="timeline-panel">
      {/* Controls Bar */}
      <div className="timeline-controls">
        <div className="timeline-actions">
          <button 
            className="timeline-btn" 
            onClick={handleSplitSelected}
            disabled={!selectedClipId}
            title="Split Clip at Playhead"
          >
            <Scissors size={14} /> Split Clip
          </button>
          <button 
            className="timeline-btn" 
            onClick={() => selectedClipId && deleteClip(selectedClipId)}
            disabled={!selectedClipId}
            title="Delete Selected Clip"
          >
            <Trash2 size={14} /> Delete Clip
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="timeline-btn" onClick={zoomOut} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zoom</span>
          <button className="timeline-btn" onClick={zoomIn} title="Zoom In">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Tracks Area */}
      <div className="timeline-track-area" ref={tracksContentRef}>
        
        {/* Clickable Ruler */}
        <div 
          className="timeline-ruler" 
          ref={rulerRef} 
          onClick={handleRulerClick}
          style={{ width: `${140 + maxDuration * pxPerSecond}px`, minWidth: '100%' }}
        >
          {renderRulerTicks()}
        </div>

        {/* Dynamic Tracks */}
        <div style={{ position: 'relative', width: `${140 + maxDuration * pxPerSecond}px`, minWidth: '100%' }}>
          
          {/* Vertical Playhead */}
          <div 
            className="playhead-line" 
            style={{ left: `${140 + currentTime * pxPerSecond}px` }}
          >
            <div className="playhead-flag"></div>
          </div>

          {tracks.map((track) => (
            <div key={track.id} className="timeline-track">
              {/* Header stuck to the left */}
              <div className={`track-header ${track.type}`}>
                {track.icon}
                <span>{track.name}</span>
              </div>

              {/* Lane Content with dropping ability */}
              <div 
                className="track-content"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, track.id)}
              >
                {clips
                  .filter((clip) => clip.track === track.id)
                  .map((clip) => (
                    <div
                      key={clip.id}
                      className={`timeline-clip ${clip.type} ${selectedClipId === clip.id ? 'selected' : ''}`}
                      style={{
                        left: `${clip.start * pxPerSecond}px`,
                        width: `${clip.duration * pxPerSecond}px`
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        selectClip(clip.id)
                      }}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                    >
                      {/* Left Trim Handle */}
                      <div 
                        className="clip-trim-handle start"
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-start')}
                      ></div>

                      <div className="clip-name">{clip.name}</div>
                      
                      {/* Right Trim Handle */}
                      <div 
                        className="clip-trim-handle end"
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-end')}
                      ></div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
