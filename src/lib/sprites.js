import { pokemon } from '../data/pokemon'

const spriteModules = import.meta.glob('../assets/pokemon-sprites/*.png', {
  eager: true,
  import: 'default',
})

export const sprites = Object.fromEntries(
  Object.entries(spriteModules).map(([path, src]) => {
    const filename = path.split('/').pop().replace('.png', '')
    return [filename, src]
  }),
)

export function createFullDexCelebration() {
  return pokemon
    .map((entry, index) => {
      const src = sprites[entry.spriteSlug]

      if (!src) {
        return null
      }

      return {
        id: `${Date.now()}-${entry.id}-${index}`,
        src,
        size: `${44 + Math.random() * 34}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2.5}s`,
        duration: `${15 + Math.random() * 4}s`,
        rotation: `${Math.random() * 360 - 180}deg`,
        driftX: `${Math.random() * 700 - 350}px`,
        driftY: `${-180 - Math.random() * 600}px`,
        scale: 0.8 + Math.random() * 1.6,
      }
    })
    .filter(Boolean)
}
