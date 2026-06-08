import React, { useRef } from 'react'
import { FolderOpen, Film, Music, Image as ImageIcon, Plus, HelpCircle } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import type { Asset } from '../store/useEditorStore'

// Sample premium assets to populate immediately
const SAMPLE_ASSETS: Asset[] = [
  {
    id: 'sample_video_1',
    name: 'Nature Sunset Stream.mp4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 15,
    size: '7.8 MB'
  },
  {
    id: 'sample_video_2',
    name: 'Urban City Escape.mp4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    duration: 15,
    size: '8.3 MB'
  },
  {
    id: 'sample_audio_1',
    name: 'Chill Ambient Beat.mp3',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372, // 6:12
    size: '8.5 MB'
  },
  {
    id: 'sample_image_1',
    name: 'Brand Logo.png',
    type: 'image',
    url: 'https://placekitten.com/200/200', // simple mockup image
    duration: 5,
    size: '450 KB'
  }
]

export const AssetLibrary: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { assets, addAsset, addClip, showToast } = useEditorStore()

  // Helper to format bytes to human readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file)
      const fileType = file.type.split('/')[0]
      let type: 'video' | 'audio' | 'image' = 'video'

      if (fileType === 'audio') type = 'audio'
      else if (fileType === 'image') type = 'image'

      const id = `asset_${Math.random().toString(36).substr(2, 9)}`

      // If video or audio, we need to load it in a temporary element to measure duration
      if (type === 'video' || type === 'audio') {
        const tempEl = document.createElement(type)
        tempEl.src = url
        
        tempEl.onloadedmetadata = () => {
          addAsset({
            id,
            name: file.name,
            type,
            url,
            duration: Math.round(tempEl.duration) || 5,
            size: formatBytes(file.size)
          })
          showToast(`Imported ${file.name} successfully!`, 'success')
        }
      } else {
        // Image default duration = 5s
        addAsset({
          id,
          name: file.name,
          type,
          url,
          duration: 5,
          size: formatBytes(file.size)
        })
        showToast(`Imported ${file.name} successfully!`, 'success')
      }
    })
  }

  // Quick add to timeline on click
  const handleQuickAdd = (asset: Asset) => {
    // Determine track: Video = 0, Audio = 1, Image = 0 (Video track overlays)
    const track = asset.type === 'audio' ? 1 : 0
    const duration = asset.type === 'image' ? 5 : asset.duration

    addClip({
      assetId: asset.id,
      name: asset.name,
      type: asset.type === 'image' ? 'video' : asset.type,
      track,
      start: 0,
      duration,
      trimStart: 0,
      volume: 1
    })
    showToast(`Added ${asset.name} to timeline`, 'success')
  }

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      assetId: asset.id,
      name: asset.name,
      type: asset.type === 'image' ? 'video' : asset.type,
      duration: asset.type === 'image' ? 5 : asset.duration
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // Load sample assets if library is empty
  const handleLoadSamples = () => {
    SAMPLE_ASSETS.forEach(asset => {
      // Check if already loaded
      if (!assets.some(a => a.id === asset.id)) {
        addAsset(asset)
      }
    })
    showToast('Loaded sample assets into library', 'success')
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Film size={16} />
      case 'audio': return <Music size={16} />
      default: return <ImageIcon size={16} />
    }
  }

  const formatDuration = (sec: number): string => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <FolderOpen size={16} /> Asset Library
        </span>
        <button 
          className="asset-btn" 
          title="Load Sample Projects/Assets"
          onClick={handleLoadSamples}
        >
          <HelpCircle size={16} />
        </button>
      </div>
      <div className="panel-content">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple
          accept="video/*,audio/*,image/*" 
          style={{ display: 'none' }}
        />
        <button 
          className="upload-btn" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={16} /> Import Media Files
        </button>

        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '24px' }}>
            <p>No media files imported yet.</p>
            <p style={{ marginTop: '8px' }}>
              Click above to import files or click the <HelpCircle size={12} style={{ verticalAlign: 'middle' }} /> icon to load sample footage.
            </p>
          </div>
        ) : (
          <div className="asset-list">
            {assets.map((asset) => (
              <div 
                key={asset.id} 
                className="asset-card"
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                <div className="asset-thumbnail">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getIcon(asset.type)
                  )}
                </div>
                <div className="asset-info">
                  <div className="asset-name" title={asset.name}>{asset.name}</div>
                  <div className="asset-meta">
                    {asset.type !== 'image' && `${formatDuration(asset.duration)} | `}{asset.size}
                  </div>
                </div>
                <div className="asset-actions">
                  <button 
                    className="asset-btn" 
                    title="Add to Timeline"
                    onClick={() => handleQuickAdd(asset)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
