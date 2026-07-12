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
        <g className="dog-skateboard">
          <path className="dog-skateboard-shadow" d="M47 137 C78 127 179 126 215 137 C181 148 80 148 47 137Z" />
          <path className="dog-skateboard-deck" d="M42 119 C52 111 66 112 78 116 C107 125 151 125 183 116 C198 111 213 112 224 120 C218 131 199 134 177 130 C144 125 111 125 80 130 C60 133 48 129 42 119Z" />
          <path className="dog-skateboard-grip" d="M72 118 C105 125 153 125 187 118 C175 124 155 127 129 127 C103 127 83 124 72 118Z" />
          <g className="dog-skateboard-trucks">
            <path d="M79 128 H105" />
            <path d="M158 128 H185" />
            <rect x="89" y="123" width="10" height="8" rx="2" />
            <rect x="166" y="123" width="10" height="8" rx="2" />
          </g>
          <g className="dog-skateboard-wheels">
            <circle cx="73" cy="134" r="9" />
            <circle cx="109" cy="134" r="8" />
            <circle cx="154" cy="134" r="8" />
            <circle cx="191" cy="134" r="9" />
            <path d="M69 134 H77 M105 134 H113 M150 134 H158 M187 134 H195" />
          </g>
        </g>

        <g className="dog-body-group" filter={`url(#dog-soft-shadow-${skin.id}-${rank})`}>
          <path className="dog-tail" d="M55 74 C35 68 26 54 32 43 C36 35 45 33 51 39 C42 44 42 56 55 63" />
          <path className="dog-body-outline" d="M51 77 C52 55 73 41 106 39 C132 38 158 43 181 53 C195 59 204 72 201 87 C197 105 176 115 141 118 C108 121 76 113 60 98 C53 91 49 84 51 77Z" />
          <path className="dog-body" d="M57 77 C58 59 77 47 108 45 C132 44 156 48 177 57 C190 62 197 74 194 87 C190 101 172 110 141 113 C111 116 82 109 67 96 C60 90 55 83 57 77Z" />
          <path className="dog-marking dog-marking-back" d="M88 49 C107 43 136 43 155 49 C146 59 123 62 104 58 C96 56 91 53 88 49Z" />
          <path className="dog-back-highlight" d="M67 66 C91 50 132 46 170 58 C180 61 186 66 189 72" />
          <path className="dog-belly" d="M67 84 C83 102 111 112 143 111 C165 110 184 101 193 86 C188 106 163 121 128 120 C96 119 72 107 63 89 C61 84 64 81 67 84Z" />
          <path className="dog-chest-fur" d="M178 79 C173 86 171 93 174 100 C165 96 160 89 162 81 C166 75 173 74 178 79Z" />
          <path className="dog-head-outline" d="M175 59 C182 39 205 32 222 43 C237 53 241 73 232 89 C223 104 198 105 183 92 C174 84 170 70 175 59Z" />
          <path className="dog-head" d="M181 60 C187 44 205 39 219 48 C231 56 234 72 227 85 C220 97 200 98 188 88 C180 81 176 70 181 60Z" />
          <path className="dog-snout-outline" d="M209 72 C220 65 239 68 246 78 C252 87 242 97 226 96 C213 95 205 89 206 81 C206 77 207 74 209 72Z" />
          <path className="dog-snout" d="M214 74 C223 69 237 71 242 79 C246 86 239 92 227 92 C217 91 211 87 211 81 C211 78 212 76 214 74Z" />
          <path className="dog-ear dog-ear-back" d="M184 50 C175 56 173 74 181 89 C185 98 196 96 198 86 C197 72 195 58 184 50Z" />
          <path className="dog-ear dog-ear-front" d="M198 48 C188 57 187 77 197 91 C202 98 212 94 213 84 C212 68 209 55 198 48Z" />
          <path className="dog-eyebrow" d="M198 56 C203 52 211 53 215 57" />
          <path className="dog-eye" d="M204 62 C204 58 210 57 212 61 C214 65 210 69 206 67 C204 66 203 64 204 62Z" />
          <circle className="dog-eye-shine" cx="208" cy="60.8" r="1.25" />
          <path className="dog-cheek" d="M216 82 C221 78 228 80 230 85 C226 91 218 90 216 82Z" />
          <path className="dog-nose" d="M233 73 C238 70 243 73 243 78 C242 83 235 85 231 81 C228 78 229 75 233 73Z" />
          <circle className="dog-nose-shine" cx="234" cy="74.2" r="1.45" />
          <path className="dog-smile" d="M221 84 C226 90 234 89 238 83" />
          <path className="dog-whisker" d="M224 79 C229 78 234 78 239 79 M224 83 C229 84 234 86 238 88" />

          <g className="dog-legs">
            <path d="M78 101 C74 109 71 116 70 124 L84 124 C87 116 90 108 91 101" />
            <path d="M119 104 C116 111 115 119 116 126 L131 126 C133 118 135 110 134 103" />
            <path d="M160 101 C163 111 167 119 171 125 L184 124 C179 114 174 105 170 99" />
            <path d="M190 91 C193 101 199 111 204 119 L217 118 C211 105 207 94 203 87" />
          </g>
          <g className="dog-paws">
            <path d="M66 124 C70 119 82 119 88 124 C84 129 70 129 66 124Z" />
            <path d="M112 126 C117 121 130 121 136 126 C132 131 117 131 112 126Z" />
            <path d="M164 124 C169 119 182 119 188 124 C183 129 169 130 164 124Z" />
            <path d="M199 118 C204 113 217 113 223 118 C219 123 204 124 199 118Z" />
          </g>

          <path className="dog-collar" d="M177 71 C185 83 196 88 210 87" />
          <circle className="dog-tag" cx="190" cy="83" r="5" />
          <text className="dog-tag-letter" x="190" y="86.4" textAnchor="middle">E</text>

          <g className="dog-fur-lines">
            <path d="M84 58 C81 63 81 68 85 72" />
            <path d="M119 51 C116 56 116 61 120 65" />
            <path d="M152 57 C149 62 150 67 154 70" />
            <path d="M190 56 C187 61 187 67 191 71" />
          </g>
          <path className="dog-shine" d="M72 65 C97 52 134 49 169 58" />
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
