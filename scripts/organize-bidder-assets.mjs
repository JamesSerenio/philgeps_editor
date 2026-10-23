import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bidderCompanies } from '../src/lib/bidderCompanies.js'
const root = fileURLToPath(new URL('../', import.meta.url))
for (const company of bidderCompanies) {
  for (const area of ['images', 'pdf/static', 'pdf/templates', 'pdf/reference']) {
    const folder = path.join(root, 'public', area, company.folder)
    fs.mkdirSync(folder, { recursive: true })
    const keep = path.join(folder, '.gitkeep')
    if (!fs.existsSync(keep)) fs.writeFileSync(keep, '')
  }
}
const mikata = bidderCompanies[0]
let copied = 0
function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  if (!fs.existsSync(destination)) { fs.copyFileSync(source, destination); copied++ }
}
for (const area of ['static', 'templates']) {
  const base = path.join(root, 'public/pdf', area)
  function copy(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (bidderCompanies.some(company => company.folder === entry.name)) continue
      if (entry.isDirectory()) copy(path.join(directory, entry.name), path.join(relative, entry.name))
      else if (/\.pdf$/i.test(entry.name)) copyFile(path.join(directory, entry.name), path.join(base, mikata.folder, relative, mikata.name + ' - ' + entry.name))
    }
  }
  copy(base)
}
const logo = path.join(root, 'public/images/manpower-letterhead-logo.png')
if (fs.existsSync(logo)) copyFile(logo, path.join(root, 'public/images', mikata.folder, mikata.name + ' - logo.png'))
console.log('Copied ' + copied + ' Mikata assets; originals preserved. Shared references were not duplicated.')
