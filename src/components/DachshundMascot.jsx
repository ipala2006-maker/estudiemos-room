import { getSkinDefinition, getSkinVisuals } from '../data/focusEconomy.js';

export function DachshundMascot({ skinId = 'classic', rank = 1, size = 'medium', label = 'Perro salchicha de Estudiemos' }) {
  const skin = getSkinDefinition(skinId);
  const visuals = getSkinVisuals(skin.id, rank);
  const isCyber = skin.id === 'cyber';
  const isEngineer = skin.id === 'engineer';
  const isClassic = skin.id === 'classic';

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
      <svg viewBox="0 0 260 150" aria-hidden="true">
        <defs>
          <filter id={`dog-soft-shadow-${skin.id}-${rank}`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>

        <g className="dog-aura">
          <ellipse cx="130" cy="124" rx="92" ry="13" />
          <path d="M61 48 C88 13 173 13 200 49" />
          <path d="M55 68 C83 29 178 29 205 70" />
        </g>

        <g className="dog-body-group" filter={`url(#dog-soft-shadow-${skin.id}-${rank})`}>
          <path className="dog-tail" d="M42 77 C24 66 22 46 39 39" />
          <ellipse className="dog-body-outline" cx="121" cy="78" rx="77" ry="37" />
          <ellipse className="dog-body" cx="121" cy="78" rx="73" ry="33" />
          <path className="dog-back-highlight" d="M61 66 C91 45 154 44 185 67" />
          <path className="dog-belly" d="M66 83 C91 106 151 109 184 83 C174 101 151 113 121 113 C91 113 73 103 66 83Z" />
          <circle className="dog-head-outline" cx="197" cy="68" r="33" />
          <circle className="dog-head" cx="197" cy="68" r="29" />
          <ellipse className="dog-snout-outline" cx="219" cy="76" rx="23" ry="17" />
          <ellipse className="dog-snout" cx="219" cy="76" rx="20" ry="14" />
          <ellipse className="dog-ear dog-ear-back" cx="186" cy="59" rx="15" ry="27" transform="rotate(13 186 59)" />
          <ellipse className="dog-ear dog-ear-front" cx="199" cy="58" rx="12" ry="24" transform="rotate(-10 199 58)" />
          <path className="dog-eyebrow" d="M199 55 C204 51 211 52 215 56" />
          <circle className="dog-eye" cx="206" cy="62" r="4" />
          <circle className="dog-eye-shine" cx="207.5" cy="60.5" r="1.25" />
          <ellipse className="dog-cheek" cx="219" cy="83" rx="7" ry="4.6" />
          <circle className="dog-nose" cx="235" cy="75" r="5.5" />
          <circle className="dog-nose-shine" cx="232.5" cy="72.8" r="1.45" />
          <path className="dog-smile" d="M221 83 C225 88 232 88 236 83" />
          <path className="dog-whisker" d="M225 79 L235 78 M225 82 L236 84" />

          <g className="dog-legs">
            <path d="M78 102 L70 124 L83 124 L89 103" />
            <path d="M119 104 L116 126 L130 126 L134 104" />
            <path d="M160 101 L167 124 L180 124 L169 101" />
            <path d="M193 91 L201 118 L214 118 L203 88" />
          </g>
          <g className="dog-paws">
            <ellipse cx="76" cy="124" rx="10" ry="4" />
            <ellipse cx="123" cy="126" rx="10" ry="4" />
            <ellipse cx="173" cy="124" rx="10" ry="4" />
            <ellipse cx="208" cy="118" rx="10" ry="4" />
          </g>

          <path className="dog-collar" d="M177 71 C185 83 196 88 210 87" />
          <circle className="dog-tag" cx="190" cy="83" r="5" />
          <text className="dog-tag-letter" x="190" y="86.4" textAnchor="middle">E</text>

          <path className="dog-shine" d="M69 66 C98 45 149 44 178 64" />
        </g>

        {isCyber && (
          <g className="dog-cyber-kit">
            <path d="M191 60 H224 C230 60 233 64 232 69 L230 76 H196 C190 76 187 72 188 67Z" />
            <path d="M198 68 H226" />
            <path d="M92 55 H137 L150 73 H180" />
            <circle cx="91" cy="55" r="4" />
            <circle cx="151" cy="73" r="4" />
            <circle cx="180" cy="73" r="4" />
          </g>
        )}

        {isEngineer && (
          <g className="dog-engineer-kit">
            <path d="M177 48 C181 33 206 27 222 40 L224 50 C209 44 191 44 177 50Z" />
            <path d="M174 51 H228" />
            <path d="M82 91 H165" />
            <rect x="94" y="86" width="15" height="16" rx="3" />
            <rect x="134" y="86" width="16" height="16" rx="3" />
          </g>
        )}

        {isClassic && (
          <g className="dog-classic-kit">
            <path d="M174 80 L197 102 L207 86 Z" />
            <circle cx="205" cy="101" r="4" />
          </g>
        )}

        <g className="dog-rank-accessory">
          <path d="M76 49 C107 31 151 31 179 49" />
          <circle cx="92" cy="47" r="3" />
          <circle cx="128" cy="39" r="3" />
          <circle cx="164" cy="47" r="3" />
        </g>

        <g className="dog-premium-mark">
          <path d="M61 87 C92 117 158 119 190 88" />
          <path d="M57 57 C89 27 163 27 199 57" />
        </g>

        <g className="dog-legendary-stars">
          <path d="M42 25 L46 35 L57 35 L48 41 L52 52 L42 45 L32 52 L36 41 L27 35 L38 35Z" />
          <path d="M222 20 L225 28 L234 28 L227 33 L230 42 L222 37 L214 42 L217 33 L210 28 L219 28Z" />
          <path d="M210 111 L213 118 L221 118 L215 123 L217 131 L210 126 L203 131 L205 123 L199 118 L207 118Z" />
        </g>
      </svg>

      <span className="dachshund-rank-badge">R{rank}</span>
    </div>
  );
}
