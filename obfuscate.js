const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

const src = fs.readFileSync('bcp_disaster_src.html', 'utf8');

// Extract script contents (preserve <script> tags, obfuscate contents)
const result = src.replace(/<script>([\s\S]*?)<\/script>/g, (match, jsCode) => {
  if (!jsCode.trim()) return match;
  const obfuscated = JavaScriptObfuscator.obfuscate(jsCode, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    splitStrings: true,
    splitStringsChunkLength: 10,
    transformObjectKeys: true,
  }).getObfuscatedCode();
  return `<script>${obfuscated}</script>`;
});

fs.writeFileSync('bcp_disaster_dist.html', result, 'utf8');
console.log('Done.');
