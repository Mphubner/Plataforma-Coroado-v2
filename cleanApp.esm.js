import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const start = content.indexOf('export type CellMember');
const end = content.indexOf('export function AdminJornadaTab()');

if (start !== -1 && end !== -1) {
   const newContent = content.substring(0, start) + '\n' + content.substring(end);
   fs.writeFileSync('src/App.tsx', newContent);
   console.log("Success");
} else {
   console.log("Failed to find indexes");
}
