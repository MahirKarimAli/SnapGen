import { useEffect } from 'react'
import { Sparkles, Cpu, ExternalLink } from 'lucide-react'
import { AssetLibrary } from './components/AssetLibrary'
import { Player } from './components/Player'
import { AIPanel } from './components/AIPanel'
import { Timeline } from './components/Timeline'
import { useEditorStore } from './store/useEditorStore'

function App() {
  const { toast, clearToast } = useEditorStore()

  // Toast automatic dismiss effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast, clearToast])

  return (
    <div className="root-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <Sparkles size={16} style={{ color: toast.type === 'success' ? 'var(--success)' : 'var(--accent-purple)' }} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="app-header">
        <div className="brand">
          <Cpu className="brand-logo" size={22} />
          <h1>SnapGen <span style={{ fontWeight: 300, color: 'var(--text-muted)' }}>AI Video Editor</span></h1>
        </div>
        
        <div className="header-actions">
          <a 
            href="https://github.com/MahirKarimAli/SnapGen" 
            target="_blank" 
            rel="noopener noreferrer"
            className="timeline-btn"
            style={{ textDecoration: 'none' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg> GitHub Repo <ExternalLink size={12} />
          </a>
          <span 
            style={{ 
              fontSize: '11px', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              color: 'var(--text-muted)' 
            }}
          >
            v1.0.0 Stable (Client-GPU)
          </span>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <div className="app-workspace">
        
        {/* Upper Dashboard Column Grid */}
        <div className="workspace-top">
          {/* Column 1: Asset Library */}
          <AssetLibrary />

          {/* Column 2: Player Preview Screen */}
          <Player />

          {/* Column 3: AI Panel & Video Options */}
          <AIPanel />
        </div>

        {/* Lower Timeline Column Area */}
        <Timeline />

      </div>
    </div>
  )
}

export default App
