import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { User, Play, RotateCcw, ChevronRight, Trophy, Sparkles, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

type GameState = 'SETUP' | 'PLAY_ORDER' | 'COLOR_PICKER'

interface SearchParams {
  state?: GameState
  picking?: string
}

export const Route = createFileRoute('/')({ 
  component: () => <App />,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      state: (search.state as GameState) || 'SETUP',
      picking: (search.picking as string) || undefined,
    }
  }
})

interface Player {
  id: string
  name: string
  orderNumber?: number
  colorNumber?: number
  password?: string
}

const COLORS_MAP: Record<number, { name: string; hex: string; textColor: string; instruction: string }> = {
  2: { name: 'Yellow', hex: '#EAB308', textColor: '#000000', instruction: 'Pot it in bottom right corner pocket' },
  3: { name: 'Green', hex: '#15803d', textColor: '#FFFFFF', instruction: 'Pot it in bottom left corner pocket' },
  4: { name: 'Brown', hex: '#78350f', textColor: '#FFFFFF', instruction: 'Any one of the bottom corner pockets' },
  5: { name: 'Blue', hex: '#1d4ed8', textColor: '#FFFFFF', instruction: 'Any one of the middle pockets' },
  6: { name: 'Pink', hex: '#db2777', textColor: '#000000', instruction: 'Any one of the pockets on the table' },
  7: { name: 'Black', hex: '#000000', textColor: '#FFFFFF', instruction: 'Any one of the top corner pockets' },
}

function SnookerBall({ hex, size = 'md', label, isHidden = false }: { hex: string; size?: 'sm' | 'md' | 'lg' | 'xl'; label?: string, isHidden?: boolean }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={`${sizeClasses[size]} rounded-full shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.5),6px_6px_12px_rgba(0,0,0,0.3)] border relative overflow-hidden transition-all duration-500 ${
          hex === '#000000' ? 'border-white/20' : 'border-white/5'
        }`}
        style={{ backgroundColor: isHidden ? '#1e293b' : hex }}
      >
        {!isHidden && (
          <>
            <div className="absolute top-[15%] left-[15%] w-[35%] h-[35%] bg-white/30 rounded-full blur-[3px]" />
            <div className="absolute bottom-[12%] right-[12%] w-[20%] h-[20%] bg-white/10 rounded-full blur-[1px]" />
          </>
        )}
        {isHidden && (
          <div className="absolute inset-0 flex items-center justify-center text-white/10">
            <EyeOff size={size === 'xl' ? 32 : 20} />
          </div>
        )}
      </div>
      {label && <span className="text-[11px] uppercase font-bold text-slate-500 tracking-widest">{label}</span>}
    </div>
  )
}

function App() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  
  const gameState = search.state || 'SETUP'
  const isPickingScreenActive = !!search.picking
  const selectedPlayerId = search.picking || null

  const [playerCount, setPlayerCount] = useState(() => {
    const saved = localStorage.getItem('shuffles_playerCount')
    return saved ? parseInt(saved) : 2
  })
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('shuffles_players')
    return saved ? JSON.parse(saved) : []
  })
  const [playerNames, setPlayerNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('shuffles_playerNames')
    return saved ? JSON.parse(saved) : Array(6).fill('')
  })
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(() => {
    const saved = localStorage.getItem('shuffles_availableNumbers')
    return saved ? JSON.parse(saved) : [2, 3, 4, 5, 6, 7]
  })

  // Persist state
  useEffect(() => {
    localStorage.setItem('shuffles_players', JSON.stringify(players))
    localStorage.setItem('shuffles_playerNames', JSON.stringify(playerNames))
    localStorage.setItem('shuffles_availableNumbers', JSON.stringify(availableNumbers))
    localStorage.setItem('shuffles_playerCount', playerCount.toString())
  }, [players, playerNames, availableNumbers, playerCount])
  const [isGlobalReveal, setIsGlobalReveal] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const playSound = useCallback((type: 'pick' | 'reveal' | 'win' | 'select' | 'close' | 'revealAll' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      if (type === 'pick') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.1)
      } else if (type === 'revealAll') {
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
      } else if (type === 'select') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(330, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.05)
      } else if (type === 'close') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.05)
      } else if (type === 'reveal') {
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.2)
      } else if (type === 'win') {
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.5)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.5)
      } else if (type === 'error') {
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(110, audioCtx.currentTime)
        oscillator.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
      }
    } catch (e) {
      console.error('Audio context failed', e)
    }
  }, [])

  // Navigation helpers
  const setGameState = useCallback((state: GameState) => {
    navigate({ search: (prev: any) => ({ ...prev, state, picking: undefined }) })
  }, [navigate])

  const setIsPickingScreenActive = useCallback((picking?: string) => {
    navigate({ search: (prev: any) => ({ ...prev, picking }) })
  }, [navigate])

  // Redirect to setup if no players but in game state
  useEffect(() => {
    if (players.length === 0 && gameState !== 'SETUP') {
      navigate({ search: {} as any })
    }
  }, [players.length, gameState, navigate])

  // Reload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState !== 'SETUP') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [gameState])

  const handleStartShuffle = (playerNames: string[]) => {
    const newPlayers = playerNames.map((name, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: name || `Player ${i + 1}`,
    }))
    
    // Set state and navigate in one go
    setPlayers(newPlayers)
    setAvailableNumbers([2, 3, 4, 5, 6, 7])
    navigate({ search: { state: 'PLAY_ORDER' } as any })
    playSound('pick')
  }

  const handlePickNumber = () => {
    if (!selectedPlayerId || availableNumbers.length === 0) return

    const randomIndex = Math.floor(Math.random() * availableNumbers.length)
    const pickedNumber = availableNumbers[randomIndex]
    
    const newAvailable = [...availableNumbers]
    newAvailable.splice(randomIndex, 1)
    
    const newPlayers = players.map(p => 
      p.id === selectedPlayerId ? { ...p, orderNumber: pickedNumber } : p
    )
    
    setPlayers(newPlayers)
    setAvailableNumbers(newAvailable)
    setIsPickingScreenActive(undefined) // Clear selection after pick
    playSound('reveal')

    const allPicked = newPlayers.every(p => p.orderNumber !== undefined)
    if (allPicked) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#ffffff']
      })
    }
  }

  const handleStartColorRound = () => {
    const sortedPlayers = [...players].sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0))
    setPlayers(sortedPlayers.map(p => ({ ...p, colorNumber: undefined })))
    setAvailableNumbers([2, 3, 4, 5, 6, 7])
    setIsGlobalReveal(false)
    setGameState('COLOR_PICKER')
    playSound('pick')
  }

  const handleRevealAll = () => {
    setIsGlobalReveal(true)
    playSound('revealAll')
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: Object.values(COLORS_MAP).map(c => c.hex)
    })
  }

  const handleOpenPickingScreen = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    if (!player) return

    setPasswordInput('')
    setPasswordError(null)

    if (player.colorNumber === undefined) {
      // first time picking → set password
      setIsSettingPassword(true)
      setIsVerifyingPassword(false)
    } else {
      // already picked → verify password
      setIsSettingPassword(false)
      setIsVerifyingPassword(true)
    }

    // ensure state updates before overlay renders
    setTimeout(() => {
      setIsPickingScreenActive(playerId)
    }, 0)

    playSound('select')
  }

  const handleSetPassword = (password: string) => {
    if (!/^\d{1,10}$/.test(password)) {
      setPasswordError('Password must be 1-10 digits')
      playSound('error')
      return
    }

    const playerId = selectedPlayerId
    if (!playerId) return

    // Pick the color now that password is set
    const player = players.find(p => p.id === playerId)
    if (player && player.colorNumber === undefined && availableNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length)
      const pickedNumber = availableNumbers[randomIndex]
      
      const newAvailable = [...availableNumbers]
      newAvailable.splice(randomIndex, 1)
      
      const newPlayers = players.map(p => 
        p.id === playerId ? { ...p, colorNumber: pickedNumber, password } : p
      )
      
      setPlayers(newPlayers)
      setAvailableNumbers(newAvailable)
      setIsSettingPassword(false)
      setPasswordError(null) // Clear any error
      playSound('reveal')

      const allPicked = newPlayers.every(p => p.colorNumber !== undefined)
      if (allPicked) {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: Object.values(COLORS_MAP).map(c => c.hex)
        })
        playSound('win')
      }
    }
  }

  const handleVerifyPassword = (password: string) => {
    const player = players.find(p => p.id === selectedPlayerId)
    if (player && player.password === password) {
      setIsVerifyingPassword(false)
      setPasswordError(null)
      playSound('reveal')
    } else {
      setPasswordError('wrong password you cheater!')
      playSound('error')
    }
  }

  const handleClosePickingScreen = () => {
    setIsPickingScreenActive(undefined)
  }

  const resetGame = () => {
    localStorage.removeItem('shuffles_players')
    localStorage.removeItem('shuffles_availableNumbers')
    setPlayers([])
    setAvailableNumbers([2, 3, 4, 5, 6, 7])
    setIsGlobalReveal(false)
    setIsSettingPassword(false)
    setIsVerifyingPassword(false)
    setPasswordInput('')
    setPasswordError(null)
    navigate({ search: {} as any }) // Reset all search params which defaults to SETUP
  }

  return (
    <div className="min-h-screen bg-midnight text-slate-100 p-4 font-sans select-none overflow-x-hidden">
      {/* Professional Dark Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-deep/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-light/5 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between mb-10 pt-6 max-w-2xl mx-auto px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-[0_5px_15px_rgba(16,185,129,0.2)] border border-white/10">
            <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">Shuffles</h1>
          </div>
        </div>
        {gameState !== 'SETUP' && !isPickingScreenActive && (
          <button 
            onClick={resetGame}
            className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group shadow-sm"
            title="Reset Game"
          >
            <RotateCcw size={18} className="text-slate-400 group-hover:text-emerald-light transition-colors" />
          </button>
        )}
      </header>

      <main className="relative z-10 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {gameState === 'SETUP' && (
            <SetupScreen 
              onStart={handleStartShuffle} 
              playerCount={playerCount} 
              setPlayerCount={setPlayerCount} 
              names={playerNames}
              setNames={setPlayerNames}
            />
          )}
          {gameState === 'PLAY_ORDER' && (
            <PlayOrderScreen 
              players={players} 
              onPick={handlePickNumber} 
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(id) => {
                setIsPickingScreenActive(id)
                playSound('select')
              }}
              onNext={handleStartColorRound}
            />
          )}
          {gameState === 'COLOR_PICKER' && (
            <ColorPickerScreen 
              players={players} 
              selectedPlayerId={selectedPlayerId}
              isPickingActive={isPickingScreenActive}
              onSelectPlayer={handleOpenPickingScreen}
              onClosePicking={handleClosePickingScreen}
              onReset={resetGame}
              isGlobalReveal={isGlobalReveal}
              onRevealAll={handleRevealAll}
              isSettingPassword={isSettingPassword}
              isVerifyingPassword={isVerifyingPassword}
              passwordInput={passwordInput}
              setPasswordInput={setPasswordInput}
              passwordError={passwordError}
              handleSetPassword={handleSetPassword}
              handleVerifyPassword={handleVerifyPassword}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function SetupScreen({ onStart, playerCount, setPlayerCount, names, setNames }: { 
  onStart: (names: string[]) => void
  playerCount: number
  setPlayerCount: (n: number) => void
  names: string[]
  setNames: (names: string[]) => void
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStart(names.slice(0, playerCount))
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="space-y-10"
    >
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-white tracking-tight uppercase">GAME SETUP</h2>
        <div className="h-1 w-12 bg-emerald-light mx-auto rounded-full" />
        <p className="text-slate-400 text-sm font-medium">Select players and enter their names</p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-light/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="space-y-8 relative z-10">
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Number of Players</label>
            <div className="flex justify-between gap-3">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-300 border ${
                    playerCount === n 
                    ? 'bg-emerald-light border-emerald-light text-midnight shadow-[0_5px_15px_rgba(16,185,129,0.3)] scale-105' 
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Player Names</label>
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <div key={i} className="relative group/input">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-emerald-light transition-colors">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder={`Player ${i + 1}`}
                      value={names[i]}
                      onChange={(e) => {
                        const newNames = [...names]
                        newNames[i] = e.target.value
                        setNames(newNames)
                      }}
                      className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 pl-14 pr-5 outline-none focus:border-emerald-light/50 focus:bg-slate-700/50 transition-all placeholder:text-slate-600 text-white font-medium shadow-inner"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-light hover:bg-emerald-light/90 text-midnight font-bold py-6 rounded-3xl shadow-[0_10px_25px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-6 text-lg uppercase tracking-widest"
            >
              Start Shuffle <ChevronRight size={22} />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  )
}

function PlayOrderScreen({ players, onPick, selectedPlayerId, onSelectPlayer, onNext }: {
  players: Player[]
  onPick: () => void
  selectedPlayerId: string | null
  onSelectPlayer: (id: string) => void
  onNext: () => void
}) {
  const isAllPicked = players.every(p => p.orderNumber !== undefined)
  
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter(p => p.orderNumber !== undefined)
      .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0))
  }, [players])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-10 pb-32"
    >
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-white tracking-tight uppercase">ROUND 1</h2>
        <div className="h-1 w-12 bg-emerald-light mx-auto rounded-full" />
        <p className="text-slate-400 text-sm font-medium">Choose a player to pick their order number</p>
      </div>

      <div className="grid gap-4">
        {players.map((player) => (
          <button 
            key={player.id}
            type="button"
            disabled={player.orderNumber !== undefined || isAllPicked}
            onClick={() => onSelectPlayer(player.id)}
            className={`group relative overflow-hidden rounded-3xl p-6 border transition-all duration-500 text-left ${
              player.orderNumber !== undefined
              ? 'bg-emerald-light/5 border-emerald-light/20 opacity-60' 
              : selectedPlayerId === player.id
              ? 'bg-emerald-light border-emerald-light shadow-[0_5px_20px_rgba(16,185,129,0.2)] scale-[1.03]'
              : 'bg-slate-900/50 border-white/5 hover:border-emerald-light/30'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                  player.orderNumber !== undefined
                  ? 'bg-emerald-light border-emerald-light text-midnight' 
                  : selectedPlayerId === player.id
                  ? 'bg-midnight text-emerald-light border-midnight shadow-inner'
                  : 'bg-slate-800/50 border-white/10 text-slate-500'
                }`}>
                  {player.orderNumber !== undefined ? <CheckCircle2 size={24} /> : <User size={24} />}
                </div>
                <div>
                  <div className={`font-bold text-xl tracking-tight transition-colors ${
                    selectedPlayerId === player.id ? 'text-midnight' : 'text-white'
                  }`}>
                    {player.name}
                  </div>
                  <div className={`text-[10px] uppercase font-bold tracking-[0.2em] transition-colors ${
                    selectedPlayerId === player.id ? 'text-midnight/60' : 'text-slate-500'
                  }`}>
                    {player.orderNumber !== undefined ? 'Confirmed' : selectedPlayerId === player.id ? 'Ready to Pick' : 'Awaiting Selection'}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {player.orderNumber !== undefined && (
                  <motion.div
                    initial={{ scale: 0, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    className={`text-5xl font-black italic drop-shadow-sm ${
                      selectedPlayerId === player.id ? 'text-midnight' : 'text-emerald-light'
                    }`}
                  >
                    {player.orderNumber}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {selectedPlayerId === player.id && (
              <motion.div 
                layoutId="active-bg"
                className="absolute inset-0 bg-gradient-to-r from-emerald-light to-[#34d399] -z-0"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      {isAllPicked && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-emerald-light/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 text-emerald-light font-bold uppercase tracking-widest text-sm">
            <Trophy size={20} /> Final Play Order
          </div>
          <div className="space-y-4">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/30 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-5">
                  <span className="text-slate-600 font-bold italic text-lg w-8">{idx + 1}</span>
                  <span className="font-bold text-white text-lg">{p.name}</span>
                </div>
                <div className="bg-emerald-light/10 text-emerald-light px-4 py-2 rounded-xl text-xs font-bold border border-emerald-light/20">
                  #{p.orderNumber}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-10 left-6 right-6 max-w-2xl mx-auto z-50">
        {!isAllPicked ? (
          <button
            onClick={onPick}
            disabled={!selectedPlayerId}
            className={`w-full font-bold py-7 rounded-3xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-xl uppercase tracking-widest ${
              selectedPlayerId 
              ? 'bg-white text-midnight hover:scale-[1.02] active:scale-95 shadow-white/10' 
              : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'
            }`}
          >
            Pick Number <Sparkles size={24} />
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full bg-emerald-light text-midnight font-bold py-7 rounded-3xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-xl uppercase tracking-widest"
          >
            Round 2: Colors <Play size={24} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function ColorPickerScreen({ players, selectedPlayerId, isPickingActive, onSelectPlayer, onClosePicking, onReset, isGlobalReveal, onRevealAll, isSettingPassword, isVerifyingPassword, passwordInput, setPasswordInput, passwordError, handleSetPassword, handleVerifyPassword }: {
  players: Player[]
  selectedPlayerId: string | null
  isPickingActive: boolean
  onSelectPlayer: (id: string) => void
  onClosePicking: () => void
  onReset: () => void
  isGlobalReveal: boolean
  onRevealAll: () => void
  isSettingPassword: boolean
  isVerifyingPassword: boolean
  passwordInput: string
  setPasswordInput: (val: string) => void
  passwordError: string | null
  handleSetPassword: (password: string) => void
  handleVerifyPassword: (password: string) => void
}) {
  const isAllPicked = players.every(p => p.colorNumber !== undefined)
  const hasAtLeastOnePick = players.some(p => p.colorNumber !== undefined)
  const activePlayer = players.find(p => p.id === selectedPlayerId)

  return (
    <div className="space-y-10 pb-40 relative">
      <AnimatePresence mode="wait">
        {!isPickingActive ? (
          <motion.div
            key="list-screen"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold text-white tracking-tight uppercase">ROUND 2</h2>
              <div className="h-1 w-12 bg-emerald-light mx-auto rounded-full" />
              <p className="text-slate-400 text-sm font-medium italic">Choose your name to pick a color</p>
            </div>

            <div className="grid gap-4">
              {players.map((player) => {
                const isPicked = player.colorNumber !== undefined
                const color = isPicked && player.colorNumber !== undefined ? COLORS_MAP[player.colorNumber] : null
                
                const isCardDisabled = isPicked && !isGlobalReveal
                const CardWrapper: any = isCardDisabled ? 'div' : 'button'

                return (
                  <CardWrapper
                    key={`player-btn-${player.id}`}
                    {...(!isCardDisabled ? { type: 'button' } : {})}
                    role={isCardDisabled ? 'button' : undefined}
                    onClick={() => {
                      if (!isCardDisabled) onSelectPlayer(player.id)
                    }}
                    className={`group relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500 text-left ${
                      isPicked
                      ? isGlobalReveal 
                        ? 'bg-slate-800/30 border-white/5 shadow-sm' 
                        : 'bg-emerald-light/10 border-emerald-light/10 cursor-not-allowed' 
                      : 'bg-slate-900/50 border-white/5 hover:border-emerald-light/20 hover:bg-slate-800/50 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10 w-full">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                          isPicked
                          ? 'bg-emerald-light/10 border-emerald-light/20 text-emerald-light' 
                          : 'bg-slate-800/50 border-white/10 text-slate-500'
                        }`}>
                          {isPicked && !isGlobalReveal ? <CheckCircle2 size={28} /> : <User size={28} />}
                        </div>
                        <div>
                          <div className="font-bold text-2xl tracking-tight text-white">
                            {player.name}
                          </div>
                          <div className="text-[10px] uppercase font-bold tracking-[0.3em] text-slate-500">
                            {isPicked ? isGlobalReveal ? 'Revealed' : 'Tap eye to see color' : 'Tap to Pick'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {isPicked && !isGlobalReveal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectPlayer(player.id)
                            }}
                            className="w-12 h-12 rounded-xl bg-emerald-light/10 hover:bg-emerald-light/20 flex items-center justify-center border border-emerald-light/20 transition-all active:scale-90"
                            title="View Color"
                          >
                            <Eye size={20} style={{ color: '#10B981' }} />
                          </button>
                        )}

                        {isPicked && isGlobalReveal && color && (
                          <motion.div
                            key={`revealed-color-${player.id}`}
                            initial={{ scale: 0, x: 20 }}
                            animate={{ scale: 1, x: 0 }}
                            className="flex items-center gap-3"
                          >
                            <span className="font-bold uppercase italic text-sm" style={{ color: color.hex === '#000000' ? '#ffffff' : color.hex }}>
                              {color.name}
                            </span>
                            <div className="relative">
                              {color.hex === '#000000' && (
                                <div className="absolute inset-0 bg-white/30 rounded-full blur-[12px]" />
                              )}
                              <SnookerBall hex={color.hex} size="sm" />
                            </div>
                          </motion.div>
                        )}
                        
                        {isPicked && !isGlobalReveal && <Trophy key={`trophy-${player.id}`} size={20} className="text-emerald-light/30" />}
                      </div>
                    </div>
                  </CardWrapper>
                )
              })}
            </div>

            <div className="fixed bottom-10 left-6 right-6 max-w-2xl mx-auto z-50 flex flex-col gap-4">
              <button
                key="reveal-all-btn"
                disabled={!hasAtLeastOnePick || isGlobalReveal}
                onClick={onRevealAll}
                className={`w-full font-bold py-6 rounded-3xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg uppercase tracking-widest ${
                  hasAtLeastOnePick && !isGlobalReveal
                  ? 'bg-emerald-light text-midnight hover:scale-[1.02] active:scale-95 shadow-emerald-light/20' 
                  : 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'
                }`}
              >
                <Eye size={24} /> Reveal All
              </button>

              {isAllPicked && (
                <button
                  key="finish-match-btn"
                  onClick={onReset}
                  className="w-full bg-white text-midnight font-bold py-6 rounded-3xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-lg uppercase tracking-widest"
                >
                  <RotateCcw size={24} /> Finish Match
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="picking-screen-overlay"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[100] bg-midnight p-6 flex flex-col items-center justify-center"
          >
            <div className="max-w-md w-full space-y-12 relative z-10">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-light/10 rounded-3xl mx-auto flex items-center justify-center border border-emerald-light/20 mb-4 shadow-sm">
                  <User size={40} className="text-emerald-light" />
                </div>
                <h2 className="text-4xl font-bold text-white tracking-tight uppercase">{activePlayer?.name}</h2>
                <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Your secret color</p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 shadow-2xl space-y-10 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-light/30 to-transparent" />
                
                <div className="flex flex-col items-center gap-8">
                  <AnimatePresence mode="wait">
                    {isSettingPassword ? (
                      <motion.div
                        key="setup-password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full space-y-6"
                      >
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white">Set a Password</h3>
                          <p className="text-slate-400 text-sm">1-10 digits only. Use this to see your color again if you forget it.</p>
                        </div>
                        
                        <div className="space-y-4">
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter digits..."
                            className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-5 px-6 text-center text-3xl tracking-[0.5em] font-black text-emerald-light outline-none focus:border-emerald-light/50 transition-all"
                            autoFocus
                          />
                          {passwordError && (
                            <p className="text-red-400 text-sm font-bold animate-shake">{passwordError}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleSetPassword(passwordInput)}
                          className="w-full bg-emerald-light hover:bg-emerald-light/90 text-midnight font-bold py-5 rounded-2xl text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        >
                          Confirm & Pick
                        </button>
                      </motion.div>
                    ) : isVerifyingPassword ? (
                      <motion.div
                        key="verify-password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full space-y-6"
                      >
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white">Enter Your Password</h3>
                          <p className="text-slate-400 text-sm">Please verify it's you to see the color.</p>
                        </div>
                        
                        <div className="space-y-4">
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter digits..."
                            className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-5 px-6 text-center text-3xl tracking-[0.5em] font-black text-emerald-light outline-none focus:border-emerald-light/50 transition-all"
                            autoFocus
                          />
                          {passwordError && (
                            <p className="text-red-400 text-sm font-bold animate-shake">{passwordError}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleVerifyPassword(passwordInput)}
                          className="w-full bg-emerald-light hover:bg-emerald-light/90 text-midnight font-bold py-5 rounded-2xl text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        >
                          Verify Identity
                        </button>
                      </motion.div>
                    ) : activePlayer?.colorNumber !== undefined && (
                      <motion.div
                        key={`reveal-result-${activePlayer.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center gap-8"
                      >
                        <div className="relative">
                          {activePlayer.colorNumber === 7 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute inset-0 bg-white/20 rounded-full blur-[40px] -z-10"
                            />
                          )}
                          <SnookerBall 
                            hex={COLORS_MAP[activePlayer.colorNumber].hex} 
                            size="xl" 
                            label={COLORS_MAP[activePlayer.colorNumber].name}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-emerald-light/10 rounded-2xl border border-emerald-light/20">
                            <p className="text-emerald-light font-bold uppercase tracking-widest text-sm mb-1">
                              Instruction:
                            </p>
                            <p className="text-white text-lg font-medium">
                              {COLORS_MAP[activePlayer.colorNumber].instruction}
                            </p>
                          </div>
                          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">
                            Memorize it and close the screen
                          </p>
                        </div>

                        <button
                          key="close-picking-btn"
                          onClick={onClosePicking}
                          className="bg-emerald-light hover:bg-emerald-light/90 text-midnight font-bold px-10 py-5 rounded-2xl text-lg uppercase tracking-widest shadow-lg transition-all active:scale-95"
                        >
                          I've seen it, Close
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.3em]">
                  Only you should be looking at this screen
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
