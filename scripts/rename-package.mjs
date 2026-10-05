import fs from 'node:fs';
const path = new URL('../package-lock.json', import.meta.url);
const lock = JSON.parse(fs.readFileSync(path, 'utf8'));
lock.name = 'kubernetes-architecture-explorer';
lock.packages[''].name = lock.name;
fs.writeFileSync(path, JSON.stringify(lock, null, 2) + '\n');
const packagePath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8').replace(/^\uFEFF/, ''));
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
