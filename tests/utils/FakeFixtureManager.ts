import { execSync } from 'child_process';
import path from 'path';

// Resolve paths to the tifo project directories from tests/utils
const SCRIPT_DIR = path.resolve(__dirname, '../../tifo/packages/fantasy-competitions-manager');
const WEB_SCRIPT_DIR = path.resolve(__dirname, '../../tifo/packages/web');

export class FakeFixtureManager {
  /**
   * Creates a fake fixture in the developer DB and returns its numerical ID.
   */
  static createFakeFixture(): number {
    console.log('⏳ Creating fake fixture...');
    const output = execSync(`npx tsx --env-file=.env.local scripts/fakeFixture/createFakeFixture.ts`, { 
      cwd: SCRIPT_DIR, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'inherit'] // Pipe stdout to capture the ID, but pass through stderr
    });
    
    // Output looks like: "Created fake fixture 12456"
    const match = output.match(/Created fake fixture (\d+)/);
    if (!match) {
      throw new Error(`Failed to parse fixture ID from output: ${output}`);
    }
    
    const fixtureId = parseInt(match[1]);
    console.log(`✅ Created fake fixture: ${fixtureId}`);
    return fixtureId;
  }

  /** Starts the fake fixture (changes status to In Play) */
  static startFakeFixture(fixtureId: number) {
    console.log(`▶️ Starting fake fixture: ${fixtureId}`);
    execSync(`npx tsx --env-file=.env.local scripts/fakeFixture/startFakeFixture.ts ${fixtureId}`, { 
      cwd: SCRIPT_DIR,
      stdio: 'inherit'
    });
  }

  /**
   * Adds a specific event to the fake fixture (e.g. Goal, Penalty).
   * Maps to EventTypes enum: 1=GOAL, 2=ASSIST, 3=YELLOWCARD, 4=REDCARD, 12=PENALTY etc.
   */
  static addFakeEvent(fixtureId: number, minute: number, typeId: number, playerId: number = 1) {
    console.log(`⚡ Adding event (type ${typeId}) at min ${minute} to fixture ${fixtureId}`);
    execSync(`npx tsx --env-file=.env.local scripts/fakeFixture/addFakeEvent.ts ${fixtureId} ${minute} ${typeId} ${playerId}`, { 
      cwd: SCRIPT_DIR,
      stdio: 'inherit'
    });
  }

  /** Ends the fake fixture (Full Time) - this triggers the payout settlement */
  static endFakeFixture(fixtureId: number) {
    console.log(`🛑 Ending fake fixture: ${fixtureId}`);
    execSync(`npx tsx --env-file=.env.local scripts/fakeFixture/endFakeFixture.ts ${fixtureId}`, { 
      cwd: SCRIPT_DIR,
      stdio: 'inherit'
    });
  }

  /** Cleanup: Deletes the fake fixture from the dev database */
  static deleteFakeFixture(fixtureId: number) {
    console.log(`🗑️ Deleting fake fixture: ${fixtureId}`);
    execSync(`npx tsx --env-file=.env.local scripts/fakeFixture/deleteFakeFixture.ts ${fixtureId}`, { 
      cwd: SCRIPT_DIR,
      stdio: 'inherit'
    });
  }

  /** Cleanup: Deletes the prediction game activity from the dev database */
  static deleteActivity(activityId: string) {
    console.log(`🗑️ Deleting activity: ${activityId}`);
    execSync(`npx tsx --env-file=.env.local scripts/delete-activity.ts ${activityId}`, { 
      cwd: WEB_SCRIPT_DIR,
      stdio: 'inherit'
    });
  }
}
