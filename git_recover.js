import { execSync } from 'child_process';
try {
  execSync('git checkout HEAD -- src/App.tsx', { stdio: 'inherit' });
  execSync('git checkout HEAD -- src/components/CellsView.tsx', { stdio: 'inherit' });
  console.log('Git checkout successful!');
} catch (err) {
  console.error('Git error', err);
}
