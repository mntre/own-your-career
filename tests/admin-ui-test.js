/**
 * Admin Portal UI Structure Test
 * Validates HTML structure, closing tags, card grid, and section toggles.
 * Run: node tests/admin-ui-test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'src', 'frontend', 'html', 'admin-portal.html');
const jsPath = path.join(__dirname, '..', 'src', 'frontend', 'js', 'admin.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

console.log('\n=== ADMIN PORTAL UI STRUCTURE TESTS ===\n');

// --- HTML Structure ---
console.log('HTML Structure:');
test('Has <style> tag', html.includes('<style>'));
test('Has </style> closing tag', html.includes('</style>'));
test('</style> comes before </head>', html.indexOf('</style>') < html.indexOf('</head>'));
test('Has </head> tag', html.includes('</head>'));
test('Has <body> tag', html.includes('<body>'));
test('Has </body> tag', html.includes('</body>'));
test('Has </html> tag', html.includes('</html>'));

// --- Card Grid ---
console.log('\nCard Grid (6 cards):');
const cards = ['employee-upload', 'employee-database', 'core-skills', 'leadership-skills', 'role-assignment', 'org-hierarchy'];
cards.forEach(c => {
  test(`Card: data-section="${c}"`, html.includes(`data-section="${c}"`));
});

// --- Sections ---
console.log('\nSections (6 sections):');
cards.forEach(c => {
  test(`Section: id="section-${c}"`, html.includes(`id="section-${c}"`));
});

// --- Tab Structure ---
console.log('\nTab Structure:');
test('Tab: data-management', html.includes('data-tab="data-management"'));
test('Tab: system-config', html.includes('data-tab="system-config"'));
test('Tab: progress-monitor', html.includes('data-tab="progress-monitor"'));
test('Tab: sftp-export', html.includes('data-tab="sftp-export"'));
test('Tab: audit-log', html.includes('data-tab="audit-log"'));

// --- Tab Content Divs ---
console.log('\nTab Content Divs:');
test('tab-data-management div', html.includes('id="tab-data-management"'));
test('tab-system-config div', html.includes('id="tab-system-config"'));
test('tab-progress-monitor div', html.includes('id="tab-progress-monitor"'));
test('tab-sftp-export div', html.includes('id="tab-sftp-export"'));
test('tab-audit-log div', html.includes('id="tab-audit-log"'));

// --- Div Balance Check ---
console.log('\nDiv Nesting (Data Management Tab):');
const dmStart = html.indexOf('id="tab-data-management"');
const scStart = html.indexOf('id="tab-system-config"');
const dmSection = html.substring(dmStart, scStart);
const openDivs = (dmSection.match(/<div/g) || []).length;
const closeDivs = (dmSection.match(/<\/div>/g) || []).length;
test(`Div balance in Data Management (opens: ${openDivs}, closes: ${closeDivs})`, openDivs === closeDivs);

// --- CSS Classes ---
console.log('\nCSS Classes:');
test('.data-mgmt-grid class defined', html.includes('.data-mgmt-grid'));
test('.data-mgmt-card class defined', html.includes('.data-mgmt-card'));
test('.data-mgmt-section class defined', html.includes('.data-mgmt-section'));
test('@keyframes fadeIn animation', html.includes('@keyframes fadeIn'));

// --- JavaScript Functions ---
console.log('\nJavaScript (admin.js):');
test('setupDataMgmtCards function', js.includes('setupDataMgmtCards'));
test('showDataMgmtSection function', js.includes('showDataMgmtSection'));
test('setupEventListeners calls setupDataMgmtCards', js.includes('this.setupDataMgmtCards()'));
test('setupEventListeners calls setupEmployeeUpload', js.includes('this.setupEmployeeUpload()'));
test('init calls setupEventListeners BEFORE checkAdminAccess', 
  js.indexOf('this.setupEventListeners()') < js.indexOf('this.checkAdminAccess()'));

// --- Upload Zone ---
console.log('\nEmployee Upload Elements:');
test('Upload zone element', html.includes('id="employee-upload-zone"'));
test('File input element', html.includes('id="employee-csv-input"'));
test('Preview section', html.includes('id="employee-preview-section"'));
test('Upload button', html.includes('id="employee-upload-btn"'));

// --- Summary ---
console.log(`\n${'='.repeat(45)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(45)}\n`);

if (failed > 0) {
  process.exit(1);
}
