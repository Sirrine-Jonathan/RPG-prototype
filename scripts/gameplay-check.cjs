// Run against a production build using an isolated Playwright browser context.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'dist');
const output = path.resolve(process.argv[3] || 'gameplay-evidence');
const evidence = { status: 'running', checks: [], errors: [], consoleErrors: [], missingAssets: [] };

async function main() {
  let browser;
  let phase = 'browser-launch';
  await fs.mkdir(output, { recursive: true });
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => evidence.errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text());
    });
    // Serve only the selected production build. Block all external services,
    // including Ollama, to keep this check offline and free of API charges.
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'rpg.test') return route.abort();
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (relative.split('/').some(part => part.startsWith('.'))) return route.abort();
      for (const directory of [root]) {
        const file = path.resolve(directory, '.' + relative);
        if (!file.startsWith(directory + path.sep)) continue;
        try {
          const body = await fs.readFile(file);
          const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
          return await route.fulfill({ status: 200, body, contentType: mime });
        } catch (error) {
          if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
        }
      }
      evidence.missingAssets.push(relative);
      await route.fulfill({ status: 404, body: 'Missing' });
    });
    async function check(name, action) {
      phase = name;
      const detail = await action();
      evidence.checks.push({ name, status: 'passed', detail });
    }
    async function clickMenu(label) {
      const point = await page.evaluate(label => {
        const scene = window.game.scene.getScene('MainMenuScene');
        const button = scene.children.list.find(child => child.text === label);
        if (!button) throw new Error('Menu button missing: ' + label);
        const bounds = window.game.canvas.getBoundingClientRect();
        return { x: bounds.left + button.x * bounds.width / window.game.scale.width,
          y: bounds.top + button.y * bounds.height / window.game.scale.height };
      }, label);
      await page.mouse.click(point.x, point.y);
    }
    async function waitForLevel(key) {
      await page.waitForFunction(key => {
        const scene = window.game?.scene.getScene(key);
        return scene?.scene.isActive() && scene.portalService?.getPortals().length > 0;
      }, key);
    }
    async function snapshot(key) {
      return page.evaluate(key => ({
        position: window.gameManager.entityManager.getPlayer().getPosition(),
        npcs: window.gameManager.entityManager.getNPCsForScene(key).length,
        active: window.game.scene.getScenes(true).map(scene => scene.scene.key)
      }), key);
    }
    await check('new game startup', async () => {
      await page.goto('http://rpg.test/');
      await page.waitForFunction(() => window.game?.scene.isActive('MainMenuScene'));
      await clickMenu('New Game');
      await waitForLevel('NewTownScene');
      const state = await snapshot('NewTownScene');
      assert.equal(state.npcs, 2);
      assert.deepEqual(state.active, ['NewTownScene']);
      return state;
    });
    await check('keyboard movement', async () => {
      const before = (await snapshot('NewTownScene')).position;
      await page.keyboard.down('ArrowRight');
      try {
        await page.waitForFunction(before => {
          const position = window.gameManager.entityManager.getPlayer().getPosition();
          return position.x > before.x + 1;
        }, before);
      } finally { await page.keyboard.up('ArrowRight'); }
      return { before, after: (await snapshot('NewTownScene')).position };
    });
    await page.screenshot({ path: path.join(output, 'town.png') });
    // Portal placement uses a test setup teleport. The real update loop must
    // detect entry, transfer entities, and select the destination spawn.
    for (const [source, target, count] of [
      ['NewTownScene', 'NewLibraryScene', 3], ['NewLibraryScene', 'NewTownScene', 2]
    ]) {
      await check(source + ' -> ' + target, async () => {
        await page.evaluate(source => {
          const portal = window.game.scene.getScene(source).portalService.getPortals()[0];
          window.gameManager.entityManager.getPlayer().setPosition(portal.x, portal.y);
        }, source);
        await waitForLevel(target);
        const state = await snapshot(target);
        assert.equal(state.npcs, count);
        assert.deepEqual(state.active, [target]);
        const clearOfPortals = await page.evaluate(target => {
          const position = window.gameManager.entityManager.getPlayer().getPosition();
          return window.game.scene.getScene(target).portalService.getPortals().every(portal =>
            Math.hypot(position.x - portal.x, position.y - portal.y) >= 60);
        }, target);
        assert.equal(clearOfPortals, true, 'Destination spawn overlaps portal');
        // Allow multiple update frames to catch immediate re-entry.
        await page.waitForTimeout(500);
        assert.deepEqual((await snapshot(target)).active, [target]);
        await page.screenshot({ path: path.join(output, target + '.png') });
        return state;
      });
    }
    await check('town checkpoint reload', async () => {
      const fixture = { currentScene: 'NewTownScene', playerPosition: { x: 812, y: 640 },
        playerInventory: [{ id: 'smoke-evidence', name: 'Smoke evidence', description: 'Synthetic test item' }] };
      await page.evaluate(fixture => localStorage.setItem('whispering_stones_save', JSON.stringify(fixture)), fixture);
      await page.reload();
      await page.waitForFunction(() => window.game?.scene.isActive('MainMenuScene'));
      await clickMenu('Load Game');
      await waitForLevel('NewTownScene');
      assert.deepEqual((await snapshot('NewTownScene')).position, fixture.playerPosition);
      const saved = await page.evaluate(() => {
        const scene = window.game.scene.getScene('NewTownScene');
        if (!scene.saveGameState()) throw new Error('Checkpoint write failed');
        return JSON.parse(localStorage.getItem('whispering_stones_save'));
      });
      assert.deepEqual(saved.playerInventory, fixture.playerInventory);
      assert.deepEqual(saved.playerPosition, fixture.playerPosition);
      assert.equal(saved.currentScene, fixture.currentScene);
      return saved;
    });
    await check('new game clears a loaded checkpoint', async () => {
      await page.reload();
      await page.waitForFunction(() => window.game?.scene.isActive('MainMenuScene'));
      await clickMenu('New Game');
      await waitForLevel('NewTownScene');
      const state = await page.evaluate(() => {
        const previousCheckpoint = localStorage.getItem('whispering_stones_save');
        const scene = window.game.scene.getScene('NewTownScene');
        if (!scene.saveGameState()) throw new Error('New-game checkpoint write failed');
        return { previousCheckpoint, saved: JSON.parse(localStorage.getItem('whispering_stones_save')) };
      });
      assert.equal(state.previousCheckpoint, null, 'New Game retained the previous checkpoint');
      assert.deepEqual(state.saved.playerInventory, [], 'New Game retained synthetic evidence');
      assert.equal(state.saved.currentScene, 'NewTownScene');
      return state;
    });
    await check('runtime and asset integrity', async () => {
      assert.deepEqual(evidence.errors, [], 'Uncaught browser errors');
      assert.deepEqual(evidence.missingAssets, [], 'Missing build assets');
      return { consoleErrors: evidence.consoleErrors.length };
    });
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = phase === 'browser-launch' ? 'blocked-before-gameplay' : 'failed';
    evidence.failure = { phase, message: error.message.split('Browser logs:')[0].trim() };
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
