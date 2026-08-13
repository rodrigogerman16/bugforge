import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, BugSeverity, BugPriority, BugStatus, EvidenceType, Platform, SessionStatus, TesterRole, ActivityEventType } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

import { AREAS } from "../src/lib/areas";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Returns a random-length unique subset (0..max items) — used for tags, which
// are applied independently of severity/priority/status, not derived from them.
function pickSome<T>(arr: T[], max: number): T[] {
  const count = Math.floor(Math.random() * (max + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * daysBack) * 86_400_000);
}

// Picks a random moment within the given day, `daysAgo` days back — callers pass
// a strictly decreasing `daysAgo` per build so releasedAt order always matches
// version order, unlike randomDate() whose overlapping ranges can invert it.
function randomDateOnDay(daysAgo: number): Date {
  const dayMs = 86_400_000;
  const now = Date.now();
  return new Date(now - daysAgo * dayMs + Math.floor(Math.random() * dayMs));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

// Spreads `count` strictly-increasing timestamps between start and end —
// used to backfill a plausible activity history for seeded bugs.
function interpolateTimestamps(start: Date, end: Date, count: number): Date[] {
  const startMs = start.getTime();
  const endMs = Math.max(end.getTime(), startMs);
  const span = endMs - startMs;
  const minGapMs = 60_000;

  // Not enough span to interpolate meaningfully (e.g. a bug created and
  // resolved the same day, so createdAt and updatedAt nearly coincide) — a
  // clamped interpolation would collapse every point onto the same instant,
  // so step forward a minute at a time from the start instead.
  if (span <= count * minGapMs) {
    return Array.from({ length: count }, (_, i) => new Date(startMs + (i + 1) * minGapMs));
  }

  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    const frac = (i + 1) / (count + 1);
    const jitter = (Math.random() - 0.5) * (span / (count + 1)) * 0.6;
    points.push(startMs + frac * span + jitter);
  }
  points.sort((a, b) => a - b);
  for (let i = 0; i < points.length; i++) {
    const min = i === 0 ? startMs + minGapMs : points[i - 1] + minGapMs;
    points[i] = Math.min(Math.max(points[i], min), endMs);
  }
  return points.map((p) => new Date(p));
}

const STATUS_MAIN_PATH: BugStatus[] = [
  BugStatus.NEW,
  BugStatus.CONFIRMED,
  BugStatus.IN_PROGRESS,
  BugStatus.FIXED,
  BugStatus.READY_FOR_QA,
  BugStatus.VERIFIED,
  BugStatus.CLOSED,
];

type BugDef = { title: string; expected: string; actual: string; trigger: string };

const BUG_DEFS: Record<string, BugDef[]> = {
  Combat: [
    {
      title: "Weapon damage not applied after parry",
      expected: "Weapon damage applies normally to the enemy after a successful parry.",
      actual: "No damage is registered on the follow-up hit after parrying.",
      trigger: "Parry an incoming melee attack, then immediately land a hit on the attacker.",
    },
    {
      title: "Player stuck in attack animation after death",
      expected: "Player character transitions to the death/ragdoll state immediately upon dying.",
      actual: "Player remains locked in the attack animation for several seconds after dying.",
      trigger: "Start a melee attack animation, then take fatal damage mid-swing.",
    },
    {
      title: "Critical hits dealing zero damage vs shielded enemies",
      expected: "Critical hits deal bonus damage that carries through an enemy's shield.",
      actual: "Critical hits against shielded enemies register as 0 damage.",
      trigger: "Land a critical hit on an enemy that has an active shield.",
    },
  ],
  "UI/HUD": [
    {
      title: "Health bar desyncs from actual HP after respawn",
      expected: "Health bar reflects full HP immediately on respawn.",
      actual: "Health bar shows the pre-death HP value for a few seconds after respawning.",
      trigger: "Take damage, die, and respawn.",
    },
    {
      title: "Inventory tooltip clips off-screen at 21:9 resolution",
      expected: "Inventory tooltip stays fully within the visible screen area at any supported resolution.",
      actual: "At 21:9, the tooltip renders partially off the right edge of the screen.",
      trigger: "Switch display resolution to 21:9, then open the inventory and hover an item.",
    },
    {
      title: "Objective marker points to wrong coordinates",
      expected: "Objective marker points to the actual objective location.",
      actual: "Objective marker points to a location roughly 40m from the real objective.",
      trigger: "Accept a new objective and check the HUD marker against the real objective location.",
    },
  ],
  Networking: [
    {
      title: "Client desync causes duplicate loot drops",
      expected: "Each loot drop is granted exactly once per client.",
      actual: "Under a brief desync, the same loot drop is granted twice to the same client.",
      trigger: "Join a session with 2+ clients, force a brief network hiccup, then trigger a loot drop.",
    },
    {
      title: "Players rubberbanding on host migration",
      expected: "Player movement stays smooth through a host migration.",
      actual: "Players visibly rubberband for several seconds during and after host migration.",
      trigger: "Have the host disconnect mid-match and observe the migration to a new host.",
    },
    {
      title: "Voice chat drops after 10 minutes in session",
      expected: "Voice chat remains connected for the full session.",
      actual: "Voice chat silently disconnects roughly 10 minutes into a session.",
      trigger: "Stay in a voice-enabled session for roughly 10 minutes.",
    },
  ],
  Physics: [
    {
      title: "Ragdoll clips through terrain on steep slopes",
      expected: "Ragdolls settle on top of the terrain surface.",
      actual: "On steep slopes, ragdolls clip through the terrain and fall out of the level.",
      trigger: "Defeat an enemy while standing on a steep slope.",
    },
    {
      title: "Vehicle flips uncontrollably on minor collision",
      expected: "Vehicles absorb minor collisions without flipping.",
      actual: "A minor collision at low speed causes the vehicle to flip end-over-end.",
      trigger: "Drive a vehicle into a small obstacle at low speed.",
    },
    {
      title: "Player falls through elevator floor",
      expected: "Player stands safely on the elevator floor while it moves.",
      actual: "Player falls through the elevator floor partway through its movement.",
      trigger: "Ride an elevator from bottom to top without moving.",
    },
  ],
  Audio: [
    {
      title: "Footstep audio missing on metal surfaces",
      expected: "Footstep audio plays on every surface type, including metal.",
      actual: "No footstep audio plays while walking on metal surfaces.",
      trigger: "Walk across a metal surface.",
    },
    {
      title: "Music loop has audible pop at loop point",
      expected: "Background music loops seamlessly with no audible artifact.",
      actual: "An audible pop is heard every time the music track loops.",
      trigger: "Let the background music track play through a full loop.",
    },
    {
      title: "Explosion SFX plays twice on kill",
      expected: "Explosion sound effect plays once per explosion.",
      actual: "The explosion SFX plays twice in rapid succession on a kill.",
      trigger: "Get an explosive kill on an enemy.",
    },
  ],
  "AI/Enemies": [
    {
      title: "Enemies stuck pathing around destructible cover",
      expected: "Enemies path around or through destructible cover without getting stuck.",
      actual: "Enemies repeatedly path back and forth against destructible cover and never reach the player.",
      trigger: "Aggro an enemy from behind a piece of destructible cover.",
    },
    {
      title: "Boss skips second phase transition",
      expected: "Boss plays its phase-2 transition and enters phase 2 at the HP threshold.",
      actual: "Boss HP drops through the phase-2 threshold with no transition and no phase-2 behavior.",
      trigger: "Reduce the boss's HP quickly through the phase-2 threshold.",
    },
    {
      title: "Allies stop taking cover under fire",
      expected: "Ally NPCs take cover when under sustained fire.",
      actual: "Allies stand in the open under fire instead of moving to nearby cover.",
      trigger: "Take an ally into sustained enemy fire.",
    },
  ],
  Progression: [
    {
      title: "XP not saved if game closes during loading screen",
      expected: "XP earned before a loading screen is persisted regardless of when the game closes.",
      actual: "XP earned in the previous match is lost if the game is closed during the next loading screen.",
      trigger: "Finish a match, then force-quit during the next loading screen.",
    },
    {
      title: "Skill tree points reset after prestige",
      expected: "Skill tree points behave per the documented prestige rules, with no unintended loss.",
      actual: "All allocated skill tree points are reset to zero immediately after prestiging, beyond what's intended.",
      trigger: "Allocate skill tree points, then prestige.",
    },
    {
      title: "Daily challenge progress not tracked",
      expected: "Progress toward the active daily challenge updates as qualifying actions are performed.",
      actual: "Daily challenge progress stays at 0% regardless of completed qualifying actions.",
      trigger: "Perform the actions required by the active daily challenge.",
    },
  ],
  Rendering: [
    {
      title: "Texture flickering on distant foliage",
      expected: "Distant foliage renders stably with no flicker.",
      actual: "Foliage at a distance flickers between two LOD states while the camera is static.",
      trigger: "Stand still and look at a foliage cluster in the distance.",
    },
    {
      title: "Shadow popping when rotating camera near buildings",
      expected: "Shadows transition smoothly as the camera rotates near buildings.",
      actual: "Shadows visibly pop between resolutions when the camera rotates near buildings.",
      trigger: "Rotate the camera near a building at close range.",
    },
    {
      title: "Particle effects cause frame drop below 30fps",
      expected: "Frame rate stays at or above 30fps during large particle effects.",
      actual: "Frame rate drops below 30fps whenever a large particle effect (e.g. an explosion) is on-screen.",
      trigger: "Trigger a large particle effect such as an explosion.",
    },
  ],
  "Save/Load": [
    {
      title: "Save file corrupts after quitting during autosave",
      expected: "Save file remains valid even if the game quits during an autosave.",
      actual: "Force-quitting during an autosave corrupts the save file, and it fails to load.",
      trigger: "Force-quit the game while an autosave is in progress.",
    },
    {
      title: "Loadout not restored correctly on continue",
      expected: "Loadout matches exactly what was equipped before quitting.",
      actual: "Continuing a save restores a different loadout than what was equipped before quitting.",
      trigger: "Equip a custom loadout, quit to the main menu, then continue the save.",
    },
    {
      title: "Cloud save conflicts overwrite local progress",
      expected: "Cloud sync resolves conflicts without silently discarding progress.",
      actual: "A cloud sync conflict silently overwrites more recent local progress with an older cloud save.",
      trigger: "Play offline on two devices, then reconnect both to cloud sync.",
    },
  ],
  Matchmaking: [
    {
      title: "Matchmaking hangs indefinitely on party of 3",
      expected: "Matchmaking completes within the expected time window for any party size.",
      actual: "Queuing as a party of exactly 3 causes matchmaking to hang indefinitely with no match found.",
      trigger: "Form a party of exactly 3 players and queue for matchmaking.",
    },
    {
      title: "Skill rating not updated after ranked match",
      expected: "Skill rating updates according to the match result immediately after a ranked match ends.",
      actual: "Skill rating stays unchanged after completing a ranked match.",
      trigger: "Complete a ranked match through to its result screen.",
    },
    {
      title: "Region lock ignored, causing high ping matches",
      expected: "Matchmaking respects the configured region lock.",
      actual: "Players are matched into servers outside their region lock, resulting in high ping.",
      trigger: "Queue for matchmaking with region lock enabled.",
    },
  ],
};

const MAPS = [
  "Industrial District",
  "Frostbite Canyon",
  "Skyline Rooftops",
  "Underground Vault",
  "Coastal Outpost",
  "Sunken Ruins",
];

const GAME_MODES = ["Team Deathmatch", "Extraction", "Free-for-All", "Campaign Mission", "Survival"];

const PC_OS_POOL = ["Windows 11", "Windows 10"];
const PC_GPU_POOL = ["RTX 4070", "RTX 4080", "RTX 3060", "RTX 4090", "RX 7800 XT", "RX 6700 XT"];

// Matches the severity colors defined in src/app/globals.css — this script
// runs outside the browser, so the CSS custom properties aren't reachable.
const SEVERITY_COLOR: Record<BugSeverity, string> = {
  BLOCKER: "#8b1e1e",
  CRITICAL: "#d03b3b",
  HIGH: "#f2762e",
  MEDIUM: "#fab219",
  LOW: "#898781",
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A self-contained, deterministically generated "capture" — no external image
// service or binary asset needed. Reads as a stylized debug screenshot rather
// than pretending to be an actual in-game render.
function screenshotSvgDataUri({
  title,
  area,
  severity,
  buildVersion,
  poster,
}: {
  title: string;
  area: string;
  severity: BugSeverity;
  buildVersion: string;
  poster?: boolean;
}): string {
  const color = SEVERITY_COLOR[severity];
  const centerGlyph = poster
    ? `<circle cx="480" cy="270" r="54" fill="#0d0d0d" opacity="0.55"/>
       <path d="M462 244 L462 296 L510 270 Z" fill="${color}"/>`
    : `<path d="M480 190 L540 300 L420 300 Z" fill="${color}" opacity="0.16" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
       <line x1="480" y1="228" x2="480" y2="264" stroke="${color}" stroke-width="4" stroke-opacity="0.55" stroke-linecap="round"/>
       <circle cx="480" cy="282" r="3" fill="${color}" opacity="0.55"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#17171a"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.18"/>
      </linearGradient>
      <pattern id="lines" width="28" height="28" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="28" stroke="#ffffff" stroke-opacity="0.03" stroke-width="8"/>
      </pattern>
    </defs>
    <rect width="960" height="540" fill="url(#bg)"/>
    <rect width="960" height="540" fill="url(#lines)"/>
    ${centerGlyph}
    <text x="40" y="52" font-family="system-ui, sans-serif" font-size="12" letter-spacing="2" fill="${color}" font-weight="700">${poster ? "VIDEO CAPTURE" : "SCREENSHOT"}</text>
    <circle cx="900" cy="46" r="5" fill="${color}"/>
    <text x="886" y="51" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#c3c2b7">${severity}</text>
    <text x="40" y="472" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#ffffff">${escapeXml(truncate(title, 46))}</text>
    <text x="40" y="500" font-family="system-ui, sans-serif" font-size="14" fill="#898781">Build ${escapeXml(buildVersion)} · ${escapeXml(area)}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function generateLogContent({
  gameName,
  buildVersion,
  area,
  severity,
  actual,
}: {
  gameName: string;
  buildVersion: string;
  area: string;
  severity: BugSeverity;
  actual: string;
}): string {
  const now = Date.now();
  const ts = (msAgo: number) => new Date(now - msAgo).toISOString();
  const handler = area.replace(/[^A-Za-z]/g, "");
  return [
    `[${ts(5200)}] INFO  GameSession: loaded ${gameName} build ${buildVersion}`,
    `[${ts(4600)}] INFO  Area: ${area}`,
    `[${ts(3800)}] DEBUG PlayerController: state=Active`,
    `[${ts(2600)}] WARN  ${handler}System: unexpected state transition detected`,
    `[${ts(1400)}] ERROR ${handler}System: ${actual}`,
    `[${ts(700)}] ERROR StackTrace: at ${handler}Handler.Process() line ${100 + Math.floor(Math.random() * 400)}`,
    `[${ts(50)}] FATAL Crash report generated. severity=${severity}`,
  ].join("\n");
}

function generateDeviceReport({
  buildVersion,
  platform,
  os,
  gpu,
  map,
  gameMode,
}: {
  buildVersion: string;
  platform: string;
  os: string | null;
  gpu: string | null;
  map: string;
  gameMode: string;
}): string {
  return JSON.stringify(
    {
      build: buildVersion,
      platform,
      os: os ?? "n/a",
      gpu: gpu ?? "n/a",
      map,
      gameMode,
      capturedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

// Real, small, CC0-licensed clips hosted by Mozilla for their own <video>
// element documentation examples — verified reachable, not a guessed URL.
const SAMPLE_VIDEO_POOL = [
  {
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    fileName: "repro-capture-1.mp4",
    fileSizeBytes: 1128375,
  },
  {
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    fileName: "repro-capture-2.mp4",
    fileSizeBytes: 515198,
  },
];

const TEST_CASE_TEMPLATES: Record<
  string,
  { title: string; steps: string; expected: string }[]
> = {
  Combat: [
    {
      title: "Melee weapon deals listed damage to an unshielded enemy",
      steps: "1. Equip a melee weapon\n2. Engage an unshielded enemy\n3. Land a hit",
      expected: "Damage dealt matches the weapon's listed value",
    },
    {
      title: "Parry window blocks incoming melee damage",
      steps: "1. Face an attacking enemy\n2. Time a parry input on the incoming hit\n3. Confirm the outcome",
      expected: "Player takes zero damage and the enemy is staggered",
    },
  ],
  "UI/HUD": [
    {
      title: "Health bar reflects current HP immediately after respawn",
      steps: "1. Reduce HP\n2. Die and respawn\n3. Check the health bar",
      expected: "Health bar shows full HP with no desync",
    },
    {
      title: "Inventory tooltip stays fully on-screen at 21:9",
      steps: "1. Switch display to 21:9\n2. Open inventory\n3. Hover an item",
      expected: "Tooltip renders fully within the visible screen area",
    },
  ],
  Networking: [
    {
      title: "Loot drops are not duplicated after a client desync",
      steps: "1. Start a session with 2+ clients\n2. Force a brief desync\n3. Trigger a loot drop",
      expected: "Exactly one loot instance is granted per drop",
    },
    {
      title: "Host migration completes without rubberbanding",
      steps: "1. Start a session as host\n2. Disconnect the host client\n3. Observe migration to a new host",
      expected: "Players continue moving smoothly with no rubberbanding",
    },
  ],
  Physics: [
    {
      title: "Ragdolls stay above terrain on steep slopes",
      steps: "1. Defeat an enemy on a steep slope\n2. Observe the ragdoll settle",
      expected: "Ragdoll rests on the terrain surface without clipping through",
    },
    {
      title: "Vehicles remain stable on minor collisions",
      steps: "1. Drive a vehicle into a small obstacle at low speed\n2. Observe vehicle behavior",
      expected: "Vehicle absorbs the impact without flipping",
    },
  ],
  Audio: [
    {
      title: "Footstep audio plays correctly on metal surfaces",
      steps: "1. Walk onto a metal surface\n2. Listen for footstep audio",
      expected: "Metal-specific footstep audio plays on every step",
    },
    {
      title: "Music loop transitions without an audible pop",
      steps: "1. Let background music play through a full loop\n2. Listen at the loop point",
      expected: "Loop transition is seamless with no audible pop",
    },
  ],
  "AI/Enemies": [
    {
      title: "Enemies path around destructible cover correctly",
      steps: "1. Place destructible cover between player and enemy\n2. Aggro the enemy",
      expected: "Enemy paths around or through cover without getting stuck",
    },
    {
      title: "Boss completes its second phase transition",
      steps: "1. Reduce boss HP to the phase-2 threshold\n2. Observe the transition",
      expected: "Boss plays its phase-2 transition and enters phase 2",
    },
  ],
  Progression: [
    {
      title: "XP earned is saved if the game closes mid-loading-screen",
      steps: "1. Earn XP\n2. Trigger a loading screen\n3. Force-quit during the load",
      expected: "XP earned before the quit is persisted on next launch",
    },
    {
      title: "Skill tree points persist across a prestige reset",
      steps: "1. Allocate skill tree points\n2. Prestige\n3. Check skill tree points",
      expected: "Points behave per the documented prestige rules with no silent loss",
    },
  ],
  Rendering: [
    {
      title: "Distant foliage renders without flickering",
      steps: "1. View foliage at a distance\n2. Pan the camera slowly",
      expected: "Foliage renders stably with no flicker",
    },
    {
      title: "Frame rate stays above 30fps during a large particle effect",
      steps: "1. Trigger a large particle effect (e.g. an explosion)\n2. Monitor frame rate",
      expected: "Frame rate remains at or above 30fps",
    },
  ],
  "Save/Load": [
    {
      title: "Save file remains valid if the game quits during autosave",
      steps: "1. Trigger an autosave\n2. Force-quit while it is in progress\n3. Relaunch",
      expected: "Save file loads without corruption",
    },
    {
      title: "Loadout is restored correctly on continue",
      steps: "1. Set a custom loadout\n2. Quit to main menu\n3. Continue the save",
      expected: "Loadout matches what was equipped before quitting",
    },
  ],
  Matchmaking: [
    {
      title: "Matchmaking completes for a party of 3",
      steps: "1. Form a party of 3\n2. Queue for matchmaking",
      expected: "A match is found within the expected time window",
    },
    {
      title: "Skill rating updates after a ranked match",
      steps: "1. Complete a ranked match\n2. Check skill rating",
      expected: "Skill rating updates according to the match result",
    },
  ],
};

async function main() {
  console.log("Seeding BugForge...");

  await prisma.evidence.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.bug.deleteMany();
  await prisma.qASession.deleteMany();
  await prisma.build.deleteMany();
  await prisma.tester.deleteMany();
  await prisma.game.deleteMany();
  await prisma.tag.deleteMany();

  const tags = await Promise.all(
    [
      { name: "crash", color: "#d03b3b" },
      { name: "performance", color: "#fab219" },
      { name: "regression-risk", color: "#f2762e" },
      { name: "needs-repro", color: "#898781" },
      { name: "reproducible", color: "#0ca30c" },
      { name: "release-blocker", color: "#8b1e1e" },
      { name: "ui-polish", color: "#6366f1" },
      { name: "networking", color: "#2a78d6" },
      { name: "audio", color: "#d6409f" },
    ].map((t) => prisma.tag.create({ data: t }))
  );

  const testers = await Promise.all(
    [
      { name: "Sam Rivera", email: "sam.rivera@bugforge.dev", role: TesterRole.QA_LEAD },
      { name: "Priya Nair", email: "priya.nair@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Jonas Weber", email: "jonas.weber@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Mei Chen", email: "mei.chen@bugforge.dev", role: TesterRole.QA_ENGINEER },
      { name: "Diego Alvarez", email: "diego.alvarez@bugforge.dev", role: TesterRole.DEVELOPER },
      { name: "Harper Lee", email: "harper.lee@bugforge.dev", role: TesterRole.PRODUCER },
    ].map((t) => prisma.tester.create({ data: t }))
  );

  const games = await Promise.all([
    prisma.game.create({
      data: {
        name: "King of Meat",
        slug: "king-of-meat",
        platform: Platform.PC,
        coverColor: "#2a78d6",
        releaseDate: new Date("2026-10-15"),
      },
    }),
    prisma.game.create({
      data: {
        name: "Voidrunner Protocol",
        slug: "voidrunner-protocol",
        platform: Platform.PLAYSTATION,
        coverColor: "#6366f1",
        releaseDate: new Date("2027-02-20"),
      },
    }),
    prisma.game.create({
      data: {
        name: "Hollow Frontier",
        slug: "hollow-frontier",
        platform: Platform.SWITCH,
        coverColor: "#d6409f",
        releaseDate: new Date("2026-12-05"),
      },
    }),
  ]);

  for (const game of games) {
    const buildVersions = ["0.9.10-beta", "0.9.12-beta", "0.9.14-beta"];
    const builds = await Promise.all(
      buildVersions.map((version, i) =>
        prisma.build.create({
          data: {
            gameId: game.id,
            version,
            branch: i === buildVersions.length - 1 ? "release/beta" : "main",
            notes: `Automated seed build ${version}`,
            releasedAt: randomDateOnDay((buildVersions.length - 1 - i) * 10 + 1),
          },
        })
      )
    );

    const latestBuild = builds[builds.length - 1];

    const sessions = await Promise.all(
      [
        { name: "Beta Test #22", status: SessionStatus.COMPLETED, build: builds[0] },
        { name: "Beta Test #23", status: SessionStatus.COMPLETED, build: builds[1] },
        { name: "Beta Test #24", status: SessionStatus.ACTIVE, build: latestBuild },
      ].map((s) =>
        prisma.qASession.create({
          data: {
            gameId: game.id,
            buildId: s.build.id,
            name: s.name,
            status: s.status,
            startedAt: randomDate(20),
            endedAt: s.status === SessionStatus.COMPLETED ? randomDate(5) : null,
          },
        })
      )
    );

    const severityWeights: [BugSeverity, number][] = [
      [BugSeverity.BLOCKER, 2],
      [BugSeverity.CRITICAL, 5],
      [BugSeverity.HIGH, 18],
      [BugSeverity.MEDIUM, 40],
      [BugSeverity.LOW, 32],
    ];
    const weightedPool: BugSeverity[] = severityWeights.flatMap(([sev, count]) =>
      Array(count).fill(sev)
    );

    // Priority is rolled independently of severity (see schema comment) — a
    // weighted pool of its own, not derived from the bug's severity pick.
    const priorityWeights: [BugPriority, number][] = [
      [BugPriority.P0, 3],
      [BugPriority.P1, 8],
      [BugPriority.P2, 24],
      [BugPriority.P3, 35],
      [BugPriority.P4, 25],
    ];
    const priorityPool: BugPriority[] = priorityWeights.flatMap(([pri, count]) =>
      Array(count).fill(pri)
    );

    const statusPool = [
      BugStatus.NEW,
      BugStatus.CONFIRMED,
      BugStatus.IN_PROGRESS,
      BugStatus.FIXED,
      BugStatus.READY_FOR_QA,
      BugStatus.VERIFIED,
      BugStatus.CLOSED,
      BugStatus.REJECTED,
      BugStatus.DUPLICATE,
    ];
    const earlyPipelineStatuses: BugStatus[] = [
      BugStatus.NEW,
      BugStatus.CONFIRMED,
      BugStatus.IN_PROGRESS,
    ];

    const bugCount = 60 + Math.floor(Math.random() * 20);
    for (let i = 0; i < bugCount; i++) {
      const area = pick(AREAS);
      const bugDef = pick(BUG_DEFS[area]);
      const severity = pick(weightedPool);
      const priority = pick(priorityPool);
      const build = pick(builds);
      const session = pick(sessions);
      const status = pick(statusPool);
      const map = pick(MAPS);
      const gameMode = pick(GAME_MODES);
      const isPC = game.platform === Platform.PC;

      // Spread discovery over the last ~6.5 weeks so weekly metrics (bugs
      // discovered/fixed this week) have real, non-uniform data to compute from.
      const discoveredDaysAgo = Math.floor(Math.random() * 46);
      const isResolved = !earlyPipelineStatuses.includes(status);
      // A resolved bug's updatedAt (its fix date) can only be on or after its
      // createdAt (its discovery date) — never before.
      const resolvedDaysAgo = isResolved
        ? Math.floor(Math.random() * (discoveredDaysAgo + 1))
        : discoveredDaysAgo;

      // A small slice of bugs still in the early pipeline are regressions —
      // fixed once before, reopened after breaking again.
      const isRegression = earlyPipelineStatuses.includes(status) && Math.random() < 0.15;

      const environmentOS = isPC ? pick(PC_OS_POOL) : null;
      const environmentGpu = isPC ? pick(PC_GPU_POOL) : null;

      // Not every bug report includes evidence — roughly half do, with
      // screenshots most common, logs and attachments less so, and video
      // (the rarest and most effortful to capture) rarest of all.
      const evidenceCreates: {
        type: EvidenceType;
        url: string;
        content?: string;
        fileName?: string;
        fileSizeBytes?: number;
        caption?: string;
      }[] = [];
      if (Math.random() < 0.55) {
        const screenshotCount = 1 + (Math.random() < 0.3 ? 1 : 0);
        for (let s = 0; s < screenshotCount; s++) {
          evidenceCreates.push({
            type: EvidenceType.IMAGE,
            url: screenshotSvgDataUri({ title: bugDef.title, area, severity, buildVersion: build.version }),
            caption: s === 0 ? "Repro screenshot" : `Repro screenshot ${s + 1}`,
            fileName: `screenshot-${s + 1}.svg`,
          });
        }
        if (Math.random() < 0.4) {
          const logContent = generateLogContent({
            gameName: game.name,
            buildVersion: build.version,
            area,
            severity,
            actual: bugDef.actual,
          });
          evidenceCreates.push({
            type: EvidenceType.LOG,
            url: "",
            content: logContent,
            fileName: "session.log",
            fileSizeBytes: Buffer.byteLength(logContent),
            caption: "Console log",
          });
        }
        if (Math.random() < 0.25) {
          const reportContent = generateDeviceReport({
            buildVersion: build.version,
            platform: game.platform,
            os: environmentOS,
            gpu: environmentGpu,
            map,
            gameMode,
          });
          evidenceCreates.push({
            type: EvidenceType.ATTACHMENT,
            url: "",
            content: reportContent,
            fileName: "device_report.json",
            fileSizeBytes: Buffer.byteLength(reportContent),
            caption: "Device report",
          });
        }
        if (Math.random() < 0.08) {
          const video = pick(SAMPLE_VIDEO_POOL);
          evidenceCreates.push({
            type: EvidenceType.VIDEO,
            url: video.url,
            fileName: video.fileName,
            fileSizeBytes: video.fileSizeBytes,
            caption: "Sample capture (placeholder repro clip)",
          });
        }
      }

      const reportedById = pick(testers).id;
      const assignedToId = Math.random() > 0.3 ? pick(testers).id : null;

      const bug = await prisma.bug.create({
        data: {
          gameId: game.id,
          buildId: build.id,
          sessionId: session.id,
          title: bugDef.title,
          description: `Observed in ${area} while testing ${game.name} on build ${build.version}. Needs triage confirmation.`,
          stepsToReproduce: [
            `1. Start ${gameMode}`,
            `2. Enter ${map}`,
            `3. ${bugDef.trigger}`,
            `4. ${bugDef.actual}`,
          ].join("\n"),
          expectedResult: bugDef.expected,
          actualResult: bugDef.actual,
          map,
          gameMode,
          environmentOS,
          environmentGpu,
          severity,
          priority,
          status,
          isRegression,
          area,
          reportedById,
          assignedToId,
          tags: { connect: pickSome(tags, 2).map((t) => ({ id: t.id })) },
          evidence: { create: evidenceCreates },
          createdAt: daysAgo(discoveredDaysAgo),
          updatedAt: daysAgo(resolvedDaysAgo),
        },
      });

      // Backfill a plausible activity history from this bug's own final
      // status/assignee — every row is real DB data driving the timeline,
      // not fabricated display text.
      const activityEvents: {
        type: ActivityEventType;
        fromValue?: string;
        toValue?: string;
        actorId?: string | null;
        targetTesterId?: string | null;
        createdAt: Date;
      }[] = [{ type: ActivityEventType.BUG_CREATED, actorId: reportedById, createdAt: bug.createdAt }];

      const mainIndex = STATUS_MAIN_PATH.indexOf(status);
      const statusPath: BugStatus[] =
        mainIndex >= 0
          ? STATUS_MAIN_PATH.slice(0, mainIndex + 1)
          : Math.random() < 0.7
            ? [BugStatus.NEW, BugStatus.CONFIRMED, status]
            : [BugStatus.NEW, status];

      const statusTransitions = statusPath.slice(1);
      if (statusTransitions.length > 0) {
        const timestamps = interpolateTimestamps(bug.createdAt, bug.updatedAt, statusTransitions.length);
        const statusActorId = assignedToId ?? reportedById;
        statusTransitions.forEach((toStatus, i) => {
          activityEvents.push({
            type: ActivityEventType.STATUS_CHANGED,
            fromValue: statusPath[i],
            toValue: toStatus,
            actorId: statusActorId,
            createdAt: timestamps[i],
          });
        });
      }

      if (assignedToId) {
        const assignedAt = new Date(bug.createdAt.getTime() + 30 * 60_000 + Math.random() * 6 * 3_600_000);
        activityEvents.push({
          type: ActivityEventType.ASSIGNED,
          targetTesterId: assignedToId,
          actorId: testers[0].id,
          createdAt: assignedAt,
        });
      }

      activityEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      await prisma.activityEvent.createMany({
        data: activityEvents.map((e) => ({ ...e, bugId: bug.id })),
      });
    }

    const testCases = await Promise.all(
      AREAS.flatMap((area) =>
        TEST_CASE_TEMPLATES[area].map((tc) =>
          prisma.testCase.create({
            data: {
              gameId: game.id,
              title: tc.title,
              description: `Regression check for ${area.toLowerCase()} systems.`,
              steps: tc.steps,
              expected: tc.expected,
              area,
            },
          })
        )
      )
    );

    // ~75% pass / 15% fail / 5% blocked / 5% skipped — a believable pass rate
    // for a game still in active beta testing.
    const resultPool = [
      ...Array(15).fill("PASS"),
      ...Array(3).fill("FAIL"),
      ...Array(1).fill("BLOCKED"),
      ...Array(1).fill("SKIPPED"),
    ];

    for (const session of sessions) {
      const runsForSession = 10 + Math.floor(Math.random() * 8);
      for (let i = 0; i < runsForSession; i++) {
        const testCase = pick(testCases);
        const result = pick(resultPool);
        await prisma.testRun.create({
          data: {
            testCaseId: testCase.id,
            sessionId: session.id,
            testerId: pick(testers).id,
            result,
            notes: result === "FAIL" ? "Reproduced — filed as a bug for follow-up." : null,
            runAt: session.startedAt ?? new Date(),
          },
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
