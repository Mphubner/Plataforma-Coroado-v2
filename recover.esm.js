import fs from 'fs';

const cellsViewContent = fs.readFileSync('src/components/CellsView.tsx', 'utf-8');
const appContent = fs.readFileSync('src/App.tsx', 'utf-8');

// The marker in CellsView is: "export type CellMember = {"
const startExtracted = cellsViewContent.indexOf('export type CellMember = {');
const extractedData = cellsViewContent.substring(startExtracted);

// The marker in App.tsx where we stitched is where startIdx was.
// In the original script we did:
// const appExtracted = content.substring(0, startIdx) + "\n" + content.substring(endIdx);
// So the App.tsx has "\nexport function AdminJornadaTab()" usually!
const joinMarker = 'export function AdminJornadaTab()';
const joinIdx = appContent.indexOf(joinMarker);

if (joinIdx !== -1) {
    const originalApp = appContent.substring(0, joinIdx) + extractedData + appContent.substring(joinIdx);
    fs.writeFileSync('src/App.tsx', originalApp);
    console.log("Restored App.tsx successfully.");
} else {
    console.log("Could not find join marker.");
}
