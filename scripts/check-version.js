// Every push needs a new version number in package.json (0.2.x for small
// changes). Fails when there are unpushed commits and the version is the same
// as the one on origin/main. Run as part of npm run verify.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()
const mine = JSON.parse(readFileSync('package.json', 'utf8')).version

try {
  const ahead = Number(run('git rev-list --count origin/main..HEAD'))
  const pushed = JSON.parse(run('git show origin/main:package.json')).version
  if (ahead > 0 && pushed === mine) {
    console.error(`Version ${mine} is already on origin/main and ${ahead} commit(s) are unpushed. Bump the version in package.json (for example 0.2.x) before pushing.`)
    process.exit(1)
  }
  console.log(`Version ${mine} (origin/main has ${pushed}, ${ahead} unpushed commit(s)).`)
} catch {
  console.log(`Version ${mine} (could not compare with origin/main).`)
}
