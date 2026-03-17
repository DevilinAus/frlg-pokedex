function CelebrationLayer({ spriteFlood }) {
  if (spriteFlood.length === 0) {
    return null
  }

  return (
    <div className="sprite-flood-layer" aria-hidden="true">
      {spriteFlood.map((sprite) => (
        <img
          key={sprite.id}
          className="sprite-flood-item"
          src={sprite.src}
          alt=""
          style={{
            width: sprite.size,
            height: sprite.size,
            left: sprite.left,
            top: sprite.top,
            animationDelay: sprite.delay,
            animationDuration: sprite.duration,
            rotate: sprite.rotation,
            scale: sprite.scale,
            '--drift-x': sprite.driftX,
            '--drift-y': sprite.driftY,
          }}
        />
      ))}
    </div>
  )
}

export default CelebrationLayer
