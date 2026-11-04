"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJUnitReport = generateJUnitReport;
function generateJUnitReport(suiteName, results) {
    const totalTests = results.length;
    const failures = results.filter((r) => !r.passed).length;
    const totalDurationSeconds = (results.reduce((acc, r) => acc + r.durationMs, 0) / 1000).toFixed(3);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<testsuites name="${escapeXml(suiteName)}" tests="${totalTests}" failures="${failures}" time="${totalDurationSeconds}">\n`;
    xml += `  <testsuite name="${escapeXml(suiteName)}" tests="${totalTests}" failures="${failures}" time="${totalDurationSeconds}">\n`;
    for (const r of results) {
        const timeSec = (r.durationMs / 1000).toFixed(3);
        xml += `    <testcase name="${escapeXml(r.name)}" time="${timeSec}">\n`;
        if (!r.passed) {
            xml += `      <failure message="${escapeXml(r.failureMessage || 'Assertion failed')}">${escapeXml(r.failureMessage || '')}</failure>\n`;
        }
        xml += `    </testcase>\n`;
    }
    xml += `  </testsuite>\n`;
    xml += `</testsuites>\n`;
    return xml;
}
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
//# sourceMappingURL=junit.js.map