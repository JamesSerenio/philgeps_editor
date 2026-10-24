import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const files = []
function scan(directory) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) scan(target)
    else if (/\.(pdf|png|jpe?g|webp|svg)$/i.test(entry.name)) files.push('/' + path.relative(path.join(root, 'public'), target).split(path.sep).join('/'))
  }
}
scan(path.join(root, 'public/pdf'))
scan(path.join(root, 'public/images'))
const target = path.join(root, 'src/lib/bidderAssetManifest.json')
const contents = JSON.stringify(files.sort(), null, 2) + '\n'
if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== contents) fs.writeFileSync(target, contents)
console.log('Indexed ' + files.length + ' public bidder/shared assets.')
