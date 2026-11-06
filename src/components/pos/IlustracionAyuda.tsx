
export function IlustracionAyuda() {
  return (
    <div className="relative mx-auto flex h-[280px] w-full max-w-[480px] items-center justify-center overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute right-8 top-5 h-56 w-56 rounded-full bg-[#F5C96A]" />
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full border border-white/10" />
      <div className="absolute right-10 top-10 h-48 w-48 rounded-full border border-white/10" />

      {/* Destellos */}
      <span className="absolute left-10 top-8 text-3xl text-[#F5C96A]">✦</span>
      <span className="absolute right-5 top-10 text-2xl text-orange-400">✦</span>
      <span className="absolute left-20 bottom-10 text-2xl text-white/50">✧</span>

      {/* Libro de ayuda */}
      <div className="absolute bottom-8 left-5 z-10 rounded-2xl bg-white/10 p-3">
        <svg viewBox="0 0 100 75" className="h-16 w-20">
          <path d="M50 16 C35 5 17 8 5 14 V64 C22 57 37 58 50 68 Z"
            fill="#FFFDF4" stroke="#F5A623" strokeWidth="3"/>
          <path d="M50 16 C65 5 83 8 95 14 V64 C78 57 63 58 50 68 Z"
            fill="#FFFFFF" stroke="#F5A623" strokeWidth="3"/>
          <path d="M50 17 V67" stroke="#315C43" strokeWidth="3"/>
          <path d="M15 26 Q30 20 40 26 M15 36 Q30 30 40 36 M60 26 Q75 20 85 26 M60 36 Q75 30 85 36"
            stroke="#B8C9BD" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* Personaje */}
      <svg
        viewBox="0 0 390 290"
        className="relative z-10 h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cabello posterior */}
        <path
          d="M171 54 C132 54 121 91 137 124 L143 151 L246 151 L252 99 C250 65 219 44 171 54Z"
          fill="#493126"
        />
        <circle cx="225" cy="105" r="29" fill="#493126"/>

        {/* Cuello */}
        <path d="M174 133 H211 V171 H174Z" fill="#D99570"/>

        {/* Cuerpo y uniforme */}
        <path
          d="M115 290 C117 222 137 174 178 161 L211 161 C255 175 276 218 280 290Z"
          fill="#315C43"
        />

        {/* Camisa */}
        <path d="M168 163 L143 180 L160 230 L185 211 L178 175Z" fill="#FFF9ED"/>
        <path d="M214 163 L242 180 L225 230 L200 211 L207 175Z" fill="#FFF9ED"/>

        {/* Delantal */}
        <path d="M166 170 Q194 185 218 170 L242 290 H142Z" fill="#244A38"/>
        <path d="M170 171 Q192 195 215 171" stroke="#E8C58B" strokeWidth="4"/>

        {/* Logo del negocio */}
        <circle cx="194" cy="226" r="19" fill="#F3C66B"/>
        <circle cx="194" cy="226" r="15" fill="#315C43"/>
        <text x="194" y="230" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#FFF7DC">CO</text>

        {/* Rostro */}
        <ellipse cx="190" cy="108" rx="39" ry="46" fill="#F4B68F"/>

        {/* Cabello frontal */}
        <path
          d="M151 102 C145 65 169 56 193 59 C220 61 235 78 228 108 C221 92 213 85 202 80 C187 96 170 95 151 102Z"
          fill="#493126"
        />
        <path d="M151 89 C138 104 146 132 154 141 L158 111Z" fill="#493126"/>
        <path d="M225 87 Q246 108 227 143 L221 110Z" fill="#493126"/>

        {/* Orejas */}
        <ellipse cx="151" cy="111" rx="7" ry="11" fill="#E9A47E"/>
        <ellipse cx="229" cy="111" rx="7" ry="11" fill="#E9A47E"/>

        {/* Ojos */}
        <path d="M170 108 Q176 101 182 108" stroke="#493126" strokeWidth="3" strokeLinecap="round"/>
        <path d="M199 108 Q206 101 212 108" stroke="#493126" strokeWidth="3" strokeLinecap="round"/>

        {/* Mejillas */}
        <ellipse cx="168" cy="124" rx="8" ry="4" fill="#ED8F86" opacity=".65"/>
        <ellipse cx="213" cy="124" rx="8" ry="4" fill="#ED8F86" opacity=".65"/>

        {/* Sonrisa */}
        <path d="M179 124 Q191 139 204 124" stroke="#9C4E47" strokeWidth="3" strokeLinecap="round"/>

        {/* Brazo señalando */}
        <path
          d="M239 184 Q275 169 292 136 Q300 125 308 133 Q316 142 304 157 Q288 190 255 212Z"
          fill="#F4B68F"
        />
        <path d="M292 136 Q301 121 313 124 Q321 127 314 137" stroke="#F4B68F" strokeWidth="8" strokeLinecap="round"/>

        {/* Computadora */}
        <rect x="264" y="202" width="115" height="66" rx="9" fill="#344B53"/>
        <rect x="270" y="208" width="103" height="53" rx="5" fill="#DCE8E5"/>
        <circle cx="322" cy="234" r="11" fill="#315C43"/>
        <path d="M316 234 L321 239 L330 228" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M251 268 H388 L378 280 H261Z" fill="#8FA4A2"/>

        {/* Burbuja de ayuda */}
        <circle cx="284" cy="117" r="29" fill="white"/>
        <path d="M275 142 L270 153 L287 143" fill="white"/>
        <text x="284" y="128" textAnchor="middle" fontSize="34" fontWeight="bold" fill="#F36B16">?</text>

        {/* Pupusa decorativa */}
        <ellipse cx="350" cy="187" rx="31" ry="11" fill="#F4C96B"/>
        <ellipse cx="350" cy="182" rx="29" ry="12" fill="#E8A84B"/>
        <path d="M328 180 Q348 166 370 180" stroke="#F8DA9A" strokeWidth="4" strokeLinecap="round"/>
        <path d="M369 177 Q379 164 385 175" stroke="#79A66A" strokeWidth="6" strokeLinecap="round"/>
      </svg>

      {/* Etiqueta de ayuda */}
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2 rounded-full border border-white/30 bg-white px-3 py-2 shadow-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#315C43] text-white">
          ?
        </span>
        <span className="text-xs font-bold text-[#315C43]">
          ¡Estamos para ayudarte!
        </span>
      </div>

    </div>
  );
}
