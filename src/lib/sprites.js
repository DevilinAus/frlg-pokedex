import { getTrackablePokemon } from '../data/pokemon'

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

export function getSpriteSrc(spriteSlug) {
  return `${baseUrl}pokemon-sprites/${spriteSlug}.png`
}

export function createFullDexCelebration(options = {}) {
  return getTrackablePokemon(options).map((entry, index) => ({
    id: `${Date.now()}-${entry.id}-${index}`,
    src: getSpriteSrc(entry.spriteSlug),
    size: `${44 + Math.random() * 34}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2.5}s`,
    duration: `${15 + Math.random() * 4}s`,
    rotation: `${Math.random() * 360 - 180}deg`,
    driftX: `${Math.random() * 700 - 350}px`,
    driftY: `${-180 - Math.random() * 600}px`,
    scale: 0.8 + Math.random() * 1.6,
  }))
}
