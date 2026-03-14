const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "src", "assets", "avatar-builder");

const dirs = {
  skin: path.join(BASE_DIR, "skin"),
  face: path.join(BASE_DIR, "face"),
  hair: path.join(BASE_DIR, "hair"),
  clothes: path.join(BASE_DIR, "clothes"),
  accessory: path.join(BASE_DIR, "accessory"),
};

Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const svgWrap = (content) => `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  ${content}
</svg>
`.trim();

const writeSvg = (folder, filename, content) => {
  fs.writeFileSync(path.join(folder, filename), svgWrap(content), "utf8");
};

const skinColors = [
  "#f6d2b1",
  "#f1c27d",
  "#e0ac69",
  "#c68642",
  "#a86f3d",
  "#8d5524",
  "#6f4322",
  "#5b371d",
];

const hairColors = [
  "#161616",
  "#2b1d14",
  "#4a2d1b",
  "#6b4423",
  "#7b4b2a",
  "#9b6a3d",
  "#c9a36a",
  "#d8b774",
  "#8b1e1e",
  "#6a1b9a",
  "#1e3a8a",
  "#0f766e",
];

const clothesPalettes = [
  ["#1e88e5", "#90caf9"],
  ["#e53935", "#ffcdd2"],
  ["#43a047", "#c8e6c9"],
  ["#8e24aa", "#e1bee7"],
  ["#fb8c00", "#ffe0b2"],
  ["#3949ab", "#c5cae9"],
  ["#00897b", "#b2dfdb"],
  ["#6d4c41", "#d7ccc8"],
  ["#546e7a", "#cfd8dc"],
  ["#c2185b", "#f8bbd0"],
  ["#5e35b1", "#d1c4e9"],
  ["#2e7d32", "#a5d6a7"],
];

function skinBase(color) {
  return `
    <circle cx="128" cy="108" r="70" fill="${color}"/>
    <rect x="92" y="156" width="72" height="42" rx="18" fill="${color}"/>
    <ellipse cx="128" cy="198" rx="54" ry="26" fill="${color}" opacity="0.16"/>
  `;
}

function faceSvg(index) {
  const brows = [
    `
      <line x1="84" y1="92" x2="104" y2="88" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
      <line x1="152" y1="88" x2="172" y2="92" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
    `,
    `
      <line x1="84" y1="90" x2="104" y2="95" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
      <line x1="152" y1="95" x2="172" y2="90" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
    `,
    `
      <path d="M84 92 Q95 86 106 92" stroke="#3b2415" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M150 92 Q161 86 172 92" stroke="#3b2415" stroke-width="4" fill="none" stroke-linecap="round"/>
    `,
    ``,
    `
      <line x1="86" y1="92" x2="104" y2="92" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
      <line x1="152" y1="92" x2="170" y2="92" stroke="#3b2415" stroke-width="4" stroke-linecap="round"/>
    `,
  ];

  const eyes = [
    `
      <circle cx="96" cy="108" r="7" fill="#1f1f1f"/>
      <circle cx="160" cy="108" r="7" fill="#1f1f1f"/>
      <circle cx="94" cy="106" r="1.5" fill="#fff"/>
      <circle cx="158" cy="106" r="1.5" fill="#fff"/>
    `,
    `
      <ellipse cx="96" cy="108" rx="8" ry="5" fill="#1f1f1f"/>
      <ellipse cx="160" cy="108" rx="8" ry="5" fill="#1f1f1f"/>
    `,
    `
      <path d="M88 108 Q96 100 104 108" stroke="#1f1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M152 108 Q160 100 168 108" stroke="#1f1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>
    `,
    `
      <line x1="88" y1="108" x2="104" y2="108" stroke="#1f1f1f" stroke-width="4" stroke-linecap="round"/>
      <line x1="152" y1="108" x2="168" y2="108" stroke="#1f1f1f" stroke-width="4" stroke-linecap="round"/>
    `,
    `
      <circle cx="96" cy="108" r="6" fill="#1f1f1f"/>
      <circle cx="160" cy="108" r="6" fill="#1f1f1f"/>
    `,
  ];

  const noses = [
    `<path d="M128 118 Q123 132 128 136" stroke="#8a5b3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M128 118 Q132 132 128 136" stroke="#8a5b3b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<line x1="128" y1="118" x2="128" y2="136" stroke="#8a5b3b" stroke-width="2.5" stroke-linecap="round"/>`,
    ``,
  ];

  const mouths = [
    `<path d="M96 145 Q128 160 160 145" stroke="#1f1f1f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    `<path d="M96 147 Q128 132 160 147" stroke="#1f1f1f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    `<line x1="98" y1="145" x2="158" y2="145" stroke="#1f1f1f" stroke-width="5" stroke-linecap="round"/>`,
    `<path d="M104 146 Q128 152 152 146" stroke="#1f1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M100 144 Q128 166 156 144" stroke="#1f1f1f" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  ];

  const blush = index % 3 === 0
    ? `
      <ellipse cx="82" cy="128" rx="10" ry="6" fill="#f4a6a6" opacity="0.28"/>
      <ellipse cx="174" cy="128" rx="10" ry="6" fill="#f4a6a6" opacity="0.28"/>
    `
    : ``;

  const freckles = index % 5 === 0
    ? `
      <circle cx="84" cy="130" r="1.5" fill="#9b6a4a"/>
      <circle cx="90" cy="132" r="1.5" fill="#9b6a4a"/>
      <circle cx="172" cy="130" r="1.5" fill="#9b6a4a"/>
      <circle cx="166" cy="132" r="1.5" fill="#9b6a4a"/>
    `
    : ``;

  const lashes = index % 4 === 1
    ? `
      <line x1="89" y1="101" x2="86" y2="97" stroke="#1f1f1f" stroke-width="2" />
      <line x1="96" y1="100" x2="96" y2="96" stroke="#1f1f1f" stroke-width="2" />
      <line x1="103" y1="101" x2="106" y2="97" stroke="#1f1f1f" stroke-width="2" />
      <line x1="153" y1="101" x2="150" y2="97" stroke="#1f1f1f" stroke-width="2" />
      <line x1="160" y1="100" x2="160" y2="96" stroke="#1f1f1f" stroke-width="2" />
      <line x1="167" y1="101" x2="170" y2="97" stroke="#1f1f1f" stroke-width="2" />
    `
    : ``;

  return `
    ${brows[index % brows.length]}
    ${eyes[index % eyes.length]}
    ${lashes}
    ${noses[index % noses.length]}
    ${mouths[index % mouths.length]}
    ${blush}
    ${freckles}
  `;
}

function hairFemale(index, color) {
  const styles = [
    `
      <ellipse cx="128" cy="64" rx="70" ry="36" fill="${color}"/>
      <path d="M60 64 Q84 120 74 186" stroke="${color}" stroke-width="22" fill="none" stroke-linecap="round"/>
      <path d="M196 64 Q172 120 182 186" stroke="${color}" stroke-width="22" fill="none" stroke-linecap="round"/>
      <rect x="76" y="76" width="104" height="18" rx="9" fill="${color}"/>
    `,
    `
      <path d="M56 58 Q128 10 200 58 L190 100 Q166 84 128 82 Q90 84 66 100 Z" fill="${color}"/>
      <path d="M72 90 Q94 140 86 200" stroke="${color}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M184 90 Q162 140 170 200" stroke="${color}" stroke-width="20" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="66" rx="68" ry="34" fill="${color}"/>
      <path d="M62 70 Q64 120 88 180" stroke="${color}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M194 70 Q192 120 168 180" stroke="${color}" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M92 78 Q128 54 164 78" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 54 Q128 12 198 54 L188 96 Q158 88 128 88 Q98 88 68 96 Z" fill="${color}"/>
      <path d="M84 86 Q84 142 64 196" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M172 86 Q172 142 192 196" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <circle cx="128" cy="40" r="18" fill="${color}"/>
    `,
    `
      <path d="M52 72 Q70 18 128 18 Q186 18 204 72 Q182 54 128 52 Q74 54 52 72 Z" fill="${color}"/>
      <path d="M78 72 Q104 108 108 188" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M178 72 Q152 108 148 188" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M110 180 Q128 204 146 180" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="62" rx="72" ry="36" fill="${color}"/>
      <path d="M72 68 Q58 122 72 182" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M184 68 Q198 122 184 182" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M92 84 Q128 64 164 84" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M104 50 Q128 72 152 50" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M54 62 Q88 18 128 24 Q168 18 202 62 L192 98 Q160 90 128 90 Q96 90 64 98 Z" fill="${color}"/>
      <path d="M68 78 Q64 110 72 142" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M188 78 Q192 110 184 142" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M116 70 Q128 86 140 70" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="64" rx="72" ry="38" fill="${color}"/>
      <path d="M70 74 Q58 102 64 136" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M186 74 Q198 102 192 136" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M100 76 Q128 52 156 76" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <circle cx="78" cy="148" r="10" fill="${color}"/>
      <circle cx="178" cy="148" r="10" fill="${color}"/>
    `,
    `
      <path d="M56 60 Q128 14 200 60 L188 104 Q164 84 128 80 Q92 84 68 104 Z" fill="${color}"/>
      <path d="M70 90 Q86 130 80 184" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M186 90 Q170 130 176 184" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M88 182 Q128 206 168 182" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="62" rx="68" ry="34" fill="${color}"/>
      <path d="M78 74 Q92 120 96 188" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M178 74 Q164 120 160 188" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <rect x="84" y="74" width="88" height="12" rx="6" fill="${color}"/>
    `,
    `
      <path d="M60 60 Q128 6 196 60 L186 94 Q158 86 128 86 Q98 86 70 94 Z" fill="${color}"/>
      <path d="M72 92 Q94 150 86 208" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M184 92 Q162 150 170 208" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M110 58 Q128 46 146 58" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="62" rx="70" ry="36" fill="${color}"/>
      <path d="M62 70 Q52 110 60 158" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M194 70 Q204 110 196 158" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M94 70 Q128 92 162 70" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
      <circle cx="68" cy="166" r="8" fill="${color}"/>
      <circle cx="188" cy="166" r="8" fill="${color}"/>
    `,
  ];
  return styles[index % styles.length];
}

function hairMale(index, color) {
  const styles = [
    `
      <ellipse cx="128" cy="70" rx="76" ry="40" fill="${color}"/>
      <rect x="64" y="74" width="128" height="18" rx="9" fill="${color}"/>
    `,
    `
      <path d="M52 90 Q72 20 128 20 Q184 20 204 90 Q188 72 170 66 Q150 60 128 60 Q106 60 86 66 Q68 72 52 90 Z" fill="${color}"/>
    `,
    `
      <rect x="58" y="40" width="140" height="52" rx="22" fill="${color}"/>
      <rect x="78" y="82" width="100" height="16" rx="8" fill="${color}"/>
    `,
    `
      <path d="M56 54 Q128 8 200 54 L188 102 Q160 86 128 84 Q96 86 68 102 Z" fill="${color}"/>
    `,
    `
      <path d="M50 82 Q60 18 128 12 Q196 18 206 82 Q186 58 128 54 Q70 58 50 82 Z" fill="${color}"/>
      <path d="M96 58 Q128 42 160 58" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="66" rx="70" ry="34" fill="${color}"/>
      <path d="M70 72 Q98 46 128 54 Q158 46 186 72" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M60 52 Q128 0 196 52 L186 92 Q156 80 128 80 Q100 80 70 92 Z" fill="${color}"/>
      <path d="M108 56 Q128 72 148 56" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M54 74 Q72 28 128 24 Q184 28 202 74 Q182 62 162 58 Q146 38 128 38 Q110 38 94 58 Q74 62 54 74 Z" fill="${color}"/>
    `,
    `
      <ellipse cx="128" cy="64" rx="68" ry="36" fill="${color}"/>
      <path d="M84 76 Q128 54 172 76" stroke="${color}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <path d="M98 54 Q128 32 158 54" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 62 Q88 18 128 24 Q168 18 198 62 L188 94 Q158 86 128 84 Q98 86 68 94 Z" fill="${color}"/>
    `,
    `
      <rect x="62" y="46" width="132" height="48" rx="18" fill="${color}"/>
      <path d="M80 84 Q128 70 176 84" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
    `,
    `
      <ellipse cx="128" cy="64" rx="72" ry="36" fill="${color}"/>
      <path d="M96 82 Q128 70 160 82" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="round"/>
    `,
  ];
  return styles[index % styles.length];
}

function hairSvg(index) {
  const color = hairColors[index % hairColors.length];
  if (index < 20) {
    return hairFemale(index, color);
  }
  return hairMale(index - 20, color);
}

function femaleClothes(index, main, accent) {
  const styles = [
    `
      <path d="M56 182 Q78 164 102 162 L154 162 Q178 164 200 182 L210 246 L46 246 Z" fill="${main}"/>
      <path d="M106 162 Q128 186 150 162" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <rect x="114" y="174" width="28" height="22" rx="8" fill="#ffffff" opacity="0.75"/>
    `,
    `
      <path d="M62 184 Q84 166 106 164 L150 164 Q172 166 194 184 L206 246 L50 246 Z" fill="${main}"/>
      <path d="M82 186 Q128 156 174 186" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 182 Q80 162 102 160 L154 160 Q176 162 198 182 L208 246 L48 246 Z" fill="${main}"/>
      <rect x="90" y="180" width="76" height="34" rx="16" fill="${accent}" opacity="0.82"/>
    `,
    `
      <path d="M60 184 Q82 164 104 162 L152 162 Q174 164 196 184 L208 246 L48 246 Z" fill="${main}"/>
      <path d="M116 162 L128 182 L140 162" fill="${accent}"/>
      <line x1="128" y1="182" x2="128" y2="236" stroke="${accent}" stroke-width="6"/>
    `,
    `
      <path d="M56 184 Q82 160 108 160 L148 160 Q174 160 200 184 L210 246 L46 246 Z" fill="${main}"/>
      <rect x="72" y="178" width="30" height="50" rx="12" fill="${accent}" opacity="0.72"/>
      <rect x="154" y="178" width="30" height="50" rx="12" fill="${accent}" opacity="0.72"/>
    `,
    `
      <path d="M60 186 Q82 164 102 162 L154 162 Q174 164 196 186 L206 246 L50 246 Z" fill="${main}"/>
      <path d="M96 170 Q128 198 160 170" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 184 Q80 164 102 162 L154 162 Q176 164 198 184 L208 246 L48 246 Z" fill="${main}"/>
      <circle cx="128" cy="188" r="10" fill="${accent}"/>
      <circle cx="128" cy="214" r="8" fill="${accent}"/>
    `,
    `
      <path d="M62 184 Q84 166 106 164 L150 164 Q172 166 194 184 L206 246 L50 246 Z" fill="${main}"/>
      <path d="M88 176 Q128 160 168 176" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M96 194 Q128 182 160 194" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 184 Q82 162 106 162 L150 162 Q174 162 198 184 L208 246 L48 246 Z" fill="${main}"/>
      <rect x="108" y="170" width="40" height="18" rx="9" fill="${accent}" opacity="0.9"/>
    `,
    `
      <path d="M60 184 Q84 164 108 162 L148 162 Q172 164 196 184 L208 246 L48 246 Z" fill="${main}"/>
      <path d="M90 184 Q128 150 166 184" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M112 160 Q128 172 144 160" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M58 186 Q80 164 104 160 L152 160 Q176 164 198 186 L208 246 L48 246 Z" fill="${main}"/>
      <path d="M80 188 Q128 210 176 188" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M60 184 Q82 164 104 162 L152 162 Q174 164 196 184 L208 246 L48 246 Z" fill="${main}"/>
      <rect x="92" y="176" width="72" height="16" rx="8" fill="${accent}" opacity="0.88"/>
      <rect x="104" y="200" width="48" height="12" rx="6" fill="${accent}" opacity="0.78"/>
    `,
  ];
  return styles[index % styles.length];
}

function maleClothes(index, main, accent) {
  const styles = [
    `
      <path d="M52 184 Q74 162 100 162 L156 162 Q182 162 204 184 L212 246 L44 246 Z" fill="${main}"/>
      <rect x="110" y="164" width="36" height="28" rx="8" fill="#ffffff" opacity="0.82"/>
    `,
    `
      <path d="M48 188 Q72 164 100 160 L156 160 Q184 164 208 188 L216 246 L40 246 Z" fill="${main}"/>
      <path d="M84 168 L128 214 L172 168" stroke="${accent}" stroke-width="12" fill="none"/>
    `,
    `
      <path d="M52 188 Q76 166 102 164 L154 164 Q180 166 204 188 L212 246 L44 246 Z" fill="${main}"/>
      <rect x="76" y="182" width="104" height="18" rx="9" fill="${accent}" opacity="0.9"/>
    `,
    `
      <path d="M56 186 Q70 166 96 160 L160 160 Q186 166 200 186 L212 246 L44 246 Z" fill="${main}"/>
      <circle cx="128" cy="196" r="10" fill="${accent}"/>
    `,
    `
      <path d="M50 188 Q72 164 100 160 L156 160 Q184 164 206 188 L216 246 L40 246 Z" fill="${main}"/>
      <rect x="62" y="180" width="32" height="54" rx="10" fill="${accent}" opacity="0.75"/>
      <rect x="162" y="180" width="32" height="54" rx="10" fill="${accent}" opacity="0.75"/>
    `,
    `
      <path d="M56 184 Q74 160 100 160 L156 160 Q182 160 200 184 L210 246 L46 246 Z" fill="${main}"/>
      <path d="M104 162 L128 196 L152 162" fill="${accent}"/>
    `,
    `
      <path d="M48 190 Q72 168 100 166 L156 166 Q184 168 208 190 L214 246 L42 246 Z" fill="${main}"/>
      <line x1="128" y1="166" x2="128" y2="236" stroke="${accent}" stroke-width="8"/>
    `,
    `
      <path d="M56 188 Q80 162 104 162 L152 162 Q176 162 200 188 L208 246 L48 246 Z" fill="${main}"/>
      <rect x="92" y="182" width="72" height="40" rx="16" fill="${accent}" opacity="0.82"/>
    `,
    `
      <path d="M52 188 Q76 164 100 160 L156 160 Q180 164 204 188 L212 246 L44 246 Z" fill="${main}"/>
      <path d="M78 176 Q128 156 178 176" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M54 184 Q76 162 104 160 L152 160 Q180 162 202 184 L212 246 L44 246 Z" fill="${main}"/>
      <rect x="112" y="176" width="32" height="54" rx="10" fill="${accent}" opacity="0.88"/>
    `,
    `
      <path d="M52 186 Q76 164 102 162 L154 162 Q180 164 204 186 L214 246 L42 246 Z" fill="${main}"/>
      <path d="M84 190 Q128 170 172 190" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M50 186 Q74 164 100 160 L156 160 Q182 164 206 186 L214 246 L42 246 Z" fill="${main}"/>
      <rect x="86" y="176" width="84" height="22" rx="10" fill="${accent}" opacity="0.84"/>
      <rect x="102" y="206" width="52" height="14" rx="7" fill="${accent}" opacity="0.76"/>
    `,
  ];
  return styles[index % styles.length];
}

function clothesSvg(index) {
  const [main, accent] = clothesPalettes[index % clothesPalettes.length];
  if (index < 20) {
    return femaleClothes(index, main, accent);
  }
  return maleClothes(index - 20, main, accent);
}

function accessorySvg(index) {
  const styles = [
    `
      <circle cx="96" cy="108" r="18" stroke="#111" stroke-width="4" fill="none"/>
      <circle cx="160" cy="108" r="18" stroke="#111" stroke-width="4" fill="none"/>
      <line x1="114" y1="108" x2="142" y2="108" stroke="#111" stroke-width="4"/>
    `,
    `
      <path d="M60 108 A68 68 0 0 1 196 108" stroke="#333" stroke-width="8" fill="none"/>
      <rect x="48" y="108" width="16" height="42" rx="6" fill="#333"/>
      <rect x="192" y="108" width="16" height="42" rx="6" fill="#333"/>
    `,
    `
      <rect x="86" y="96" width="26" height="22" rx="4" stroke="#111" stroke-width="4" fill="none"/>
      <rect x="144" y="96" width="26" height="22" rx="4" stroke="#111" stroke-width="4" fill="none"/>
      <line x1="112" y1="106" x2="144" y2="106" stroke="#111" stroke-width="4"/>
    `,
    `
      <path d="M88 78 Q128 64 168 78" stroke="#444" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    `
      <circle cx="128" cy="84" r="8" fill="#ffd54f"/>
      <path d="M128 92 L122 106 L134 106 Z" fill="#ffd54f"/>
    `,
    `
      <path d="M78 94 Q96 82 114 94" stroke="#111" stroke-width="5" fill="none"/>
      <path d="M142 94 Q160 82 178 94" stroke="#111" stroke-width="5" fill="none"/>
    `,
    `
      <rect x="92" y="136" width="72" height="10" rx="5" fill="#111"/>
    `,
    `
      <circle cx="72" cy="90" r="10" fill="#00bcd4"/>
      <circle cx="184" cy="90" r="10" fill="#00bcd4"/>
    `,
    `
      <path d="M128 54 L134 70 L152 70 L138 80 L144 98 L128 88 L112 98 L118 80 L104 70 L122 70 Z" fill="#ffeb3b"/>
    `,
    `
      <path d="M64 108 Q128 84 192 108" stroke="#795548" stroke-width="6" fill="none" stroke-linecap="round"/>
    `,
    `
      <rect x="98" y="64" width="60" height="18" rx="9" fill="#ef4444"/>
    `,
    `
      <circle cx="128" cy="64" r="14" fill="#22c55e"/>
    `,
    `
      <path d="M88 152 Q128 170 168 152" stroke="#111" stroke-width="6" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M72 88 Q96 64 120 88" stroke="#111" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M136 88 Q160 64 184 88" stroke="#111" stroke-width="6" fill="none" stroke-linecap="round"/>
    `,
    `
      <rect x="108" y="54" width="40" height="14" rx="7" fill="#60a5fa"/>
      <circle cx="128" cy="52" r="8" fill="#60a5fa"/>
    `,
    `
      <path d="M84 82 Q128 48 172 82" stroke="#f59e0b" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="84" cy="82" r="4" fill="#f59e0b"/>
      <circle cx="172" cy="82" r="4" fill="#f59e0b"/>
    `,
    `
      <circle cx="128" cy="148" r="8" fill="#111"/>
    `,
    `
      <rect x="72" y="98" width="112" height="8" rx="4" fill="#111" opacity="0.8"/>
    `,
    `
      <path d="M70 120 Q128 96 186 120" stroke="#1d4ed8" stroke-width="5" fill="none" stroke-linecap="round"/>
    `,
    `
      <path d="M118 58 L128 74 L138 58" fill="#ec4899"/>
      <circle cx="128" cy="50" r="7" fill="#ec4899"/>
    `,
  ];
  return styles[index % styles.length];
}

// Skins
skinColors.forEach((color, i) => {
  writeSvg(dirs.skin, `skin${i + 1}.svg`, skinBase(color));
});

// Faces
for (let i = 0; i < 20; i++) {
  writeSvg(dirs.face, `face${i + 1}.svg`, faceSvg(i));
}

// Hair (40 total: 20 female-first, 20 male)
for (let i = 0; i < 40; i++) {
  writeSvg(dirs.hair, `hair${i + 1}.svg`, hairSvg(i));
}

// Clothes (40 total: 20 female-first, 20 male)
for (let i = 0; i < 40; i++) {
  writeSvg(dirs.clothes, `clothes${i + 1}.svg`, clothesSvg(i));
}

// Accessories
for (let i = 0; i < 20; i++) {
  writeSvg(dirs.accessory, `accessory${i + 1}.svg`, accessorySvg(i));
}

console.log("Avatares mejorados generados correctamente en:");
console.log(BASE_DIR);
console.log("Skins:", skinColors.length);
console.log("Faces: 20");
console.log("Hair: 40");
console.log("Clothes: 40");
console.log("Accessories: 20");