import dachshundMascotCyber from '../assets/dachshund-mascot-cyber.jpg';
import dachshundMascotEngineer from '../assets/dachshund-mascot-engineer.jpg';
import dachshundMascotRender from '../assets/dachshund-mascot-render.jpg';
import { getSkinDefinition, getSkinVisuals } from '../data/focusEconomy.js';

const SKIN_BADGES = {
  classic: 'CL',
  cyber: 'CY',
  engineer: 'IN'
};

const SKIN_IMAGES = {
  classic: dachshundMascotRender,
  cyber: dachshundMascotCyber,
  engineer: dachshundMascotEngineer
};

export function DachshundMascot({
  skinId = 'classic',
  rank = 1,
  size = 'medium',
  label = 'Perro salchicha de Estudiemos',
  showBadges = true
}) {
  const skin = getSkinDefinition(skinId);
  const visuals = getSkinVisuals(skin.id, rank);
  const badge = SKIN_BADGES[skin.id] ?? skin.name.slice(0, 2).toUpperCase();
  const mascotImage = SKIN_IMAGES[skin.id] ?? dachshundMascotRender;

  return (
    <div
      className={`dachshund-mascot dachshund-mascot-${size} skin-${skin.id} rank-${rank}`}
      style={{
        '--dog-body': visuals.body,
        '--dog-belly': visuals.belly,
        '--dog-ear': visuals.ear,
        '--dog-accent': visuals.accent,
        '--dog-glow': visuals.glow,
        '--dog-sparkle-opacity': visuals.sparkleOpacity,
        '--dog-premium-opacity': visuals.premiumOpacity,
        '--dog-legendary-opacity': visuals.legendaryOpacity,
        '--dog-accessory-opacity': visuals.accessoryOpacity,
        '--dog-shine-opacity': visuals.shineOpacity,
        '--dog-scale': visuals.scale
      }}
      aria-label={label}
      role="img"
    >
      <div className="dachshund-render-card" aria-hidden="true">
        <span className="dachshund-render-aura" />
        <img className="dachshund-render-image" src={mascotImage} alt="" draggable="false" />
        {showBadges && <span className="dachshund-render-skin-tag">{badge}</span>}
      </div>

      {showBadges && <span className="dachshund-rank-badge">R{rank}</span>}
    </div>
  );
}
