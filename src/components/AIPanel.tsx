import React, { useState } from 'react'
import { Sparkles, Languages, VolumeX, Mic, Square, Tv, Smartphone, Loader2 } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'

export const AIPanel: React.FC = () => {
  const {
    clips,
    aspectRatio,
    isNoiseFilterActive,
    setAspectRatio,
    setNoiseFilter,
    addClip,
    showToast
  } = useEditorStore()

  const [isTranscribing, setIsTranscribing] = useState(false)
  const [ttsText, setTtsText] = useState('')
  const [ttsVoice, setTtsVoice] = useState('adam')
  const [isGeneratingTts, setIsGeneratingTts] = useState(false)

  // Subtitle Transcription Workflow (Mock Whisper API)
  const handleAutoSubtitles = () => {
    // Check if there are video clips on track 0
    const videoClips = clips.filter(c => c.track === 0)
    if (videoClips.length === 0) {
      showToast('No video clips found on timeline to transcribe.', 'info')
      return
    }

    setIsTranscribing(true)
    showToast('AI Whisper model is transcribing audio track...', 'info')

    setTimeout(() => {
      // Add timed subtitles based on timeline duration
      const subtitleData = [
        { start: 0.5, duration: 2.5, text: 'Welcome to the SnapGen video editing experience.' },
        { start: 3.5, duration: 3.0, text: 'This showcase runs entirely inside your browser.' },
        { start: 7.0, duration: 2.8, text: 'AI subtitles and voice cleaning are fully active.' }
      ]

      subtitleData.forEach(sub => {
        addClip({
          name: `Subtitle: "${sub.text.substring(0, 15)}..."`,
          type: 'text',
          track: 2,
          start: sub.start,
          duration: sub.duration,
          trimStart: 0,
          volume: 1,
          text: sub.text
        })
      })

      setIsTranscribing(false)
      showToast('Auto-subtitles generated successfully!', 'success')
    }, 2000)
  }

  // Text-To-Speech Workflow
  const handleGenerateTts = () => {
    if (!ttsText.trim()) {
      showToast('Please enter some text script to generate voiceover.', 'info')
      return
    }

    setIsGeneratingTts(true)
    showToast(`Synthesizing voice track with "${ttsVoice}" model...`, 'info')

    setTimeout(() => {
      // Calculate average duration: 3 words per second, min 2s
      const wordsCount = ttsText.split(' ').length
      const duration = Math.max(2, Math.round(wordsCount / 2.5))

      addClip({
        name: `TTS Voiceover (${ttsVoice})`,
        type: 'audio',
        track: 1,
        start: 0,
        duration,
        trimStart: 0,
        volume: 1,
        // Mocking source url with a standard audio file for timeline playback
        assetId: 'sample_audio_1' 
      })

      setIsGeneratingTts(false)
      setTtsText('')
      showToast('AI synthesized voiceover added to timeline.', 'success')
    }, 1500)
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title" style={{ color: 'var(--accent-purple)' }}>
          <Sparkles size={16} /> AI Toolset & Settings
        </span>
      </div>
      <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Layout Aspect Ratios */}
        <div className="ai-section">
          <div className="ai-section-title">Video Canvas Ratio</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button 
              className={`timeline-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                justifyContent: 'center',
                borderColor: aspectRatio === '16:9' ? 'var(--accent-purple)' : 'var(--border-color)',
                backgroundColor: aspectRatio === '16:9' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
              }}
              onClick={() => setAspectRatio('16:9')}
            >
              <Tv size={14} /> 16:9
            </button>
            <button 
              className={`timeline-btn ${aspectRatio === '9:16' ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                justifyContent: 'center',
                borderColor: aspectRatio === '9:16' ? 'var(--accent-purple)' : 'var(--border-color)',
                backgroundColor: aspectRatio === '9:16' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
              }}
              onClick={() => setAspectRatio('9:16')}
            >
              <Smartphone size={14} /> 9:16
            </button>
            <button 
              className={`timeline-btn ${aspectRatio === '1:1' ? 'active' : ''}`}
              style={{ 
                flex: 1, 
                justifyContent: 'center',
                borderColor: aspectRatio === '1:1' ? 'var(--accent-purple)' : 'var(--border-color)',
                backgroundColor: aspectRatio === '1:1' ? 'rgba(139, 92, 246, 0.1)' : 'transparent'
              }}
              onClick={() => setAspectRatio('1:1')}
            >
              <Square size={14} /> 1:1
            </button>
          </div>
        </div>

        {/* AI Audio Voice Cleaner */}
        <div className="ai-section">
          <div className="ai-section-title">Voice Enhancer</div>
          <div className="ai-toggle-container" style={{ marginTop: '6px' }}>
            <div className="ai-toggle-label">
              <VolumeX size={16} style={{ color: 'var(--success)' }} />
              <div>
                <div>AI Noise Suppressor</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cut background hum (High-Pass)</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isNoiseFilterActive}
                onChange={(e) => {
                  setNoiseFilter(e.target.checked)
                  showToast(
                    e.target.checked 
                      ? 'AI Noise Suppressor enabled (150Hz cutoff filter active)' 
                      : 'AI Noise Suppressor disabled',
                    'info'
                  )
                }}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Auto Subtitle Generator */}
        <div className="ai-section">
          <div className="ai-section-title">Auto-Transcriptions</div>
          <div className="ai-card" style={{ marginTop: '6px' }}>
            <div className="ai-description">
              Analyze audio tracks using the AI Whisper model to auto-generate timed subtitle overlays on the subtitle track.
            </div>
            <button 
              className="ai-action-btn"
              onClick={handleAutoSubtitles}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <>
                  <Loader2 size={14} className="pulse" style={{ animation: 'spin 1s linear infinite' }} />
                  Transcribing...
                </>
              ) : (
                <>
                  <Languages size={14} /> Generate Subtitles
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text-To-Speech Speech Creator */}
        <div className="ai-section">
          <div className="ai-section-title">AI Text-To-Speech (TTS)</div>
          <div className="ai-card" style={{ marginTop: '6px' }}>
            <textarea
              className="ai-input"
              placeholder="Type your script here to generate a voice narration clip..."
              rows={3}
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
            ></textarea>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="ai-input"
                style={{ flex: 1, padding: '8px' }}
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
              >
                <option value="adam">Voice: Adam (Male)</option>
                <option value="bella">Voice: Bella (Female)</option>
                <option value="c3po">Voice: Robot (Synth)</option>
              </select>
              
              <button 
                className="ai-action-btn"
                style={{ padding: '8px 12px' }}
                onClick={handleGenerateTts}
                disabled={isGeneratingTts}
              >
                {isGeneratingTts ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Mic size={14} />
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
