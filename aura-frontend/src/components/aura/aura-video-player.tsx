import { useState, useRef, useEffect } from "react"
import screenfull from "screenfull"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Loader2
} from "lucide-react"

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface AuraVideoPlayerProps {
  url: string
  title: string
  onEnded?: () => void
  onProgressUpdate?: (playedSeconds: number) => void
  onPlay?: () => void
  onPause?: () => void
}

const extractYouTubeId = (rawUrl: string) => {
  if (!rawUrl) return null;
  const cleanStr = String(rawUrl).replace(/['"<>\\\[\]\s]/g, "");
  if (cleanStr.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(cleanStr)) return cleanStr;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\?v=)([^#&?]*).*/;
  const match = cleanStr.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00"
  const date = new Date(seconds * 1000)
  const hh = date.getUTCHours()
  const mm = date.getUTCMinutes()
  const ss = date.getUTCSeconds().toString().padStart(2, "0")
  if (hh) return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`
  return `${mm}:${ss}`
}

export function AuraVideoPlayer({ url, title, onEnded, onProgressUpdate, onPlay, onPause }: AuraVideoPlayerProps) {
  const [isReady, setIsReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const progressIntervalRef = useRef<NodeJS.Timeout>()

  const ytId = extractYouTubeId(url)

  useEffect(() => {
    if (!ytId) return

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('aura-yt-iframe', {
        videoId: ytId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          playsinline: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true)
            setDuration(event.target.getDuration())
            event.target.setVolume(volume)
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true)
              onPlay?.()
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false)
              onPause?.()
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setPlaying(false)
              onPause?.()
              if (onEnded) onEnded()
            }
          }
        }
      })
    }

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      window.onYouTubeIframeAPIReady = initPlayer
    } else {
      initPlayer()
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [ytId])

  useEffect(() => {
    if (playing && !isSeeking) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const currentTime = playerRef.current.getCurrentTime()
          const totalTime = playerRef.current.getDuration() || 1
          setPlayed(currentTime / totalTime)
          if (onProgressUpdate) onProgressUpdate(currentTime)
        }
      }, 500)
    } else {
      clearInterval(progressIntervalRef.current)
    }
    return () => clearInterval(progressIntervalRef.current)
  }, [playing, isSeeking, onProgressUpdate])

  useEffect(() => {
    if (screenfull.isEnabled) {
      screenfull.on("change", () => {
        setIsFullscreen(screenfull.isFullscreen)
      })
    }
    return () => {
      if (screenfull.isEnabled) {
        screenfull.off("change", () => { })
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      } else if (e.key === "f") {
        e.preventDefault()
        handleToggleFullscreen()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        if (playerRef.current) {
          const newTime = playerRef.current.getCurrentTime() + 5
          playerRef.current.seekTo(newTime, true)
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (playerRef.current) {
          const newTime = playerRef.current.getCurrentTime() - 5
          playerRef.current.seekTo(newTime, true)
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [playing])

  const togglePlay = () => {
    if (!playerRef.current) return
    if (playing) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const handleToggleFullscreen = () => {
    if (screenfull.isEnabled && containerRef.current) {
      screenfull.toggle(containerRef.current)
    }
  }

  const handleSeekMouseDown = () => {
    setIsSeeking(true)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value))
  }

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setIsSeeking(false)
    if (playerRef.current) {
      const newTime = parseFloat((e.target as HTMLInputElement).value) * duration
      playerRef.current.seekTo(newTime, true)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    setMuted(val === 0)
    if (playerRef.current) {
      playerRef.current.setVolume(val)
      if (val > 0) playerRef.current.unMute()
    }
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    if (muted) {
      setMuted(false)
      playerRef.current.unMute()
      playerRef.current.setVolume(volume || 80)
    } else {
      setMuted(true)
      playerRef.current.mute()
    }
  }

  if (!ytId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-3xl flex items-center justify-center text-white">
        Invalid Video URL
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-[0_16px_48px_rgb(0,0,0,0.12)] border border-slate-800 flex items-center justify-center group"
      onMouseMove={() => {
        setShowControls(true)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = setTimeout(() => {
          if (playing) setShowControls(false)
        }, 3000)
      }}
      onMouseLeave={() => {
        if (playing) setShowControls(false)
      }}
    >
      {/* 🚀 THE FIX: Removed the scale-[1.3] crop. Video is now 100% visible. */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Adds a soft dark gradient at the top to blend the YouTube title bar */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-900 to-transparent z-10 opacity-90" />
        <div id="aura-yt-iframe" className="w-full h-full" />
      </div>

      <div
        className="absolute inset-0 z-10"
        onClick={togglePlay}
        onDoubleClick={(e) => {
          if (!playerRef.current) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left
          const currentTime = playerRef.current.getCurrentTime()
          if (x < rect.width / 3) {
            playerRef.current.seekTo(currentTime - 10, true)
          } else if (x > (rect.width / 3) * 2) {
            playerRef.current.seekTo(currentTime + 10, true)
          }
        }}
      />

      {!isReady && (
        <div className="absolute inset-0 z-30 bg-slate-900 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 text-sm font-medium">Booting Custom Engine...</p>
        </div>
      )}

      {isReady && !playing && played === 0 && (
        <div className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all pointer-events-auto cursor-pointer hover:bg-blue-500 hover:scale-105"
          >
            <Play size={32} className="ml-2" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showControls && isReady && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 pt-24 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"
          >
            <div className="flex items-center gap-4 mb-3">
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={played}
                onMouseDown={handleSeekMouseDown}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                onTouchStart={handleSeekMouseDown}
                onTouchEnd={handleSeekMouseUp}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors cursor-pointer">
                  {playing ? <Pause size={24} /> : <Play size={24} />}
                </button>

                <div className="flex items-center gap-3 group">
                  <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors cursor-pointer">
                    {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step="any"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover:w-24 opacity-0 group-hover:opacity-100 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 transition-all duration-300"
                  />
                </div>

                <div className="text-white text-xs font-semibold font-mono tracking-wide">
                  {formatTime(played * duration)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <p className="text-white/80 text-sm font-semibold truncate max-w-[250px] hidden sm:block">
                  {title}
                </p>
                <button onClick={handleToggleFullscreen} className="text-white hover:text-blue-400 transition-colors cursor-pointer">
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}