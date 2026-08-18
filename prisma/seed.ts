import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient, BugSeverity, BugPriority, BugStatus, EvidenceType, Platform, SessionStatus, TesterRole, ActivityEventType, RelationshipType, BuildStatus, TestCasePriority, QADiscipline, QualityGateMetric, GateOperator } from "../src/generated/prisma/client";
import type { Bug } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Returns a random-length unique subset (0..max items) — used for tags, which
// are applied independently of severity/priority/status, not derived from them.
function pickSome<T>(arr: T[], max: number): T[] {
  const count = Math.floor(Math.random() * (max + 1));
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

// Picks a random moment within the given day, `daysAgo` days back — callers pass
// a strictly decreasing `daysAgo` per build so releasedAt order always matches
// version order, unlike an independently-rolled random date whose overlapping
// ranges could invert it.
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

type SeedActivityEvent = {
  type: ActivityEventType;
  fromValue?: string;
  toValue?: string;
  actorId?: string | null;
  targetTesterId?: string | null;
  createdAt: Date;
};

// Backfills a plausible activity history from a bug's own final status/
// assignee — every row is real DB data driving the timeline, not fabricated
// display text. Shared by both the main per-bug seed loop and the dedicated
// regression bugs, which need the same status-transition backfill.
function buildActivityEvents({
  bug,
  status,
  reportedById,
  assignedToId,
  leadTesterId,
}: {
  bug: { id: string; createdAt: Date; updatedAt: Date };
  status: BugStatus;
  reportedById: string;
  assignedToId: string | null;
  leadTesterId: string;
}): SeedActivityEvent[] {
  const activityEvents: SeedActivityEvent[] = [
    { type: ActivityEventType.BUG_CREATED, actorId: reportedById, createdAt: bug.createdAt },
  ];

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
      actorId: leadTesterId,
      createdAt: assignedAt,
    });
  }

  activityEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return activityEvents;
}

type BugDef = { title: string; expected: string; actual: string; trigger: string };

// The real, user-manageable game-area taxonomy (see the Area model) — every
// area below is seeded as a real row, with genuine bug/test-case content of
// its own rather than a shallow relabeling of the old 10-area list.
const AREA_DEFS: { name: string; discipline: QADiscipline }[] = [
  { name: "Gameplay", discipline: QADiscipline.GAMEPLAY },
  { name: "Combat", discipline: QADiscipline.GAMEPLAY },
  { name: "Movement", discipline: QADiscipline.GAMEPLAY },
  { name: "AI", discipline: QADiscipline.GAMEPLAY },
  { name: "Animation", discipline: QADiscipline.GAMEPLAY },
  { name: "UI", discipline: QADiscipline.UI },
  { name: "Audio", discipline: QADiscipline.AUDIO },
  { name: "Networking", discipline: QADiscipline.NETWORKING },
  { name: "Performance", discipline: QADiscipline.PERFORMANCE },
  { name: "Graphics", discipline: QADiscipline.PERFORMANCE },
  { name: "Physics", discipline: QADiscipline.GAMEPLAY },
  { name: "Input", discipline: QADiscipline.UI },
  { name: "Localization", discipline: QADiscipline.LOCALIZATION },
  { name: "Accessibility", discipline: QADiscipline.ACCESSIBILITY },
];

const BUG_DEFS: Record<string, BugDef[]> = {
  Gameplay: [
    {
      title: "Objective completion not registering in the mission log",
      expected: "Completing an objective marks it done in the mission log immediately.",
      actual: "The mission log still shows the objective as incomplete after it's been completed.",
      trigger: "Complete any active mission objective and open the mission log.",
    },
    {
      title: "Difficulty setting resets to default after loading a save",
      expected: "The difficulty selected at save time is restored exactly on load.",
      actual: "Loading a save silently resets difficulty to the default setting.",
      trigger: "Set a non-default difficulty, save, quit, then load the save.",
    },
    {
      title: "Interactable prompt fails to appear on reachable objects",
      expected: "The interact prompt appears whenever a reachable interactable object is in range.",
      actual: "Some reachable interactable objects never show the interact prompt.",
      trigger: "Approach an interactable object within its normal interaction range.",
    },
  ],
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
  Movement: [
    {
      title: "Player clips through geometry when sprinting into a corner",
      expected: "Player collides with corner geometry normally at any movement speed.",
      actual: "Sprinting into a tight corner lets the player clip partway through the wall.",
      trigger: "Sprint directly into a tight interior corner.",
    },
    {
      title: "Double-jump input dropped after wall-slide",
      expected: "The double-jump is available immediately after leaving a wall-slide.",
      actual: "The double-jump input is silently ignored for about a second after a wall-slide.",
      trigger: "Wall-slide down a surface, then jump away and immediately press jump again.",
    },
    {
      title: "Character momentum not preserved across a zipline dismount",
      expected: "Horizontal momentum from the zipline carries over into the dismount jump.",
      actual: "Dismounting a zipline zeroes out horizontal momentum instead of carrying it over.",
      trigger: "Ride a zipline at speed and dismount with a jump input.",
    },
  ],
  UI: [
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
  AI: [
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
  Animation: [
    {
      title: "Reload animation doesn't cancel when swapping weapons mid-animation",
      expected: "Swapping weapons mid-reload immediately cancels the reload animation.",
      actual: "The reload animation keeps playing on the old weapon for a moment after swapping.",
      trigger: "Start a reload, then swap to a different weapon before it finishes.",
    },
    {
      title: "T-pose flashes briefly when transitioning between idle and run",
      expected: "The idle-to-run transition blends smoothly with no bind-pose frame.",
      actual: "A single T-pose frame flashes on-screen when transitioning from idle to run.",
      trigger: "Stand still, then start running.",
    },
    {
      title: "Climb animation doesn't align hands to ledge geometry",
      expected: "Hand placement in the climb animation aligns with the actual ledge geometry.",
      actual: "Hands visibly float off the ledge surface during the climb animation on uneven ledges.",
      trigger: "Climb onto a ledge with an irregular or angled edge.",
    },
  ],
  Performance: [
    {
      title: "Particle effects cause frame drop below 30fps",
      expected: "Frame rate stays at or above 30fps during large particle effects.",
      actual: "Frame rate drops below 30fps whenever a large particle effect (e.g. an explosion) is on-screen.",
      trigger: "Trigger a large particle effect such as an explosion.",
    },
    {
      title: "Memory usage climbs steadily during long play sessions",
      expected: "Memory usage stays within a stable range over the course of a play session.",
      actual: "Memory usage climbs steadily and never plateaus over a long play session.",
      trigger: "Play continuously for two or more hours without restarting the game.",
    },
    {
      title: "Load times increase significantly after 2+ hours of continuous play",
      expected: "Load times stay roughly consistent regardless of session length.",
      actual: "Level load times grow noticeably longer the longer a single session runs.",
      trigger: "Play continuously for 2+ hours, then trigger a level load.",
    },
  ],
  Graphics: [
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
      title: "Water reflection shows inverted geometry at oblique angles",
      expected: "Water reflections mirror the scene correctly at any camera angle.",
      actual: "At oblique viewing angles, the water reflection shows visibly inverted/distorted geometry.",
      trigger: "Look across a water surface at a shallow, oblique angle.",
    },
  ],
  Input: [
    {
      title: "Controller vibration doesn't stop after switching to keyboard/mouse",
      expected: "Controller vibration stops as soon as input switches to keyboard/mouse.",
      actual: "Controller vibration keeps running for several seconds after switching to keyboard/mouse.",
      trigger: "Play with a controller, then switch to keyboard/mouse mid-session.",
    },
    {
      title: "Rebound key bindings don't persist after relaunch",
      expected: "Custom key bindings are restored exactly as configured on next launch.",
      actual: "Custom key bindings silently revert to defaults after relaunching the game.",
      trigger: "Rebind a key, quit the game fully, then relaunch.",
    },
    {
      title: "Analog stick deadzone ignored below 15% setting",
      expected: "The configured deadzone value is respected down to its minimum setting.",
      actual: "Setting the deadzone below 15% has no effect — stick drift still occurs.",
      trigger: "Set the analog stick deadzone below 15% and leave the stick untouched.",
    },
  ],
  Localization: [
    {
      title: "German subtitle text overflows the dialogue box",
      expected: "Subtitle text wraps or scales to fit the dialogue box in every supported language.",
      actual: "Longer German translations overflow past the edges of the dialogue box.",
      trigger: "Set the game language to German and trigger a dialogue line with a long translation.",
    },
    {
      title: "Currency values not formatted per regional locale in the store",
      expected: "Store prices use the correct currency symbol and separator for the active locale.",
      actual: "Store prices show the default locale's formatting regardless of the selected region.",
      trigger: "Set a non-default region and open the in-game store.",
    },
    {
      title: "Untranslated placeholder string shown in Japanese menu",
      expected: "Every menu string has a real translation for each supported language.",
      actual: "A raw placeholder key is displayed instead of translated text in the Japanese settings menu.",
      trigger: "Set the game language to Japanese and open the settings menu.",
    },
  ],
  Accessibility: [
    {
      title: "Colorblind mode doesn't apply to enemy health bars",
      expected: "Colorblind mode's palette adjustments apply to every HUD element that uses color, including health bars.",
      actual: "Enemy health bars keep the default color palette even with colorblind mode enabled.",
      trigger: "Enable colorblind mode and engage an enemy to view its health bar.",
    },
    {
      title: "Screen reader skips the settings menu focus order",
      expected: "The screen reader announces every focusable settings menu item in order.",
      actual: "The screen reader silently skips several items when navigating the settings menu.",
      trigger: "Enable the screen reader and tab through the settings menu.",
    },
    {
      title: "Subtitle size setting doesn't affect cutscene subtitles",
      expected: "The subtitle size setting applies consistently to both gameplay and cutscene subtitles.",
      actual: "Increasing subtitle size affects gameplay subtitles but cutscene subtitles stay at default size.",
      trigger: "Increase the subtitle size setting, then play a cutscene with subtitles.",
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
  { title: string; preconditions: string; steps: string; expected: string }[]
> = {
  Gameplay: [
    {
      title: "Objective completion registers correctly in the mission log",
      preconditions: "Player has an active mission with at least one incomplete objective.",
      steps: "1. Complete the active objective\n2. Open the mission log",
      expected: "The objective is marked complete in the mission log",
    },
    {
      title: "Difficulty setting persists after loading a save",
      preconditions: "Player has a save file created on a non-default difficulty.",
      steps: "1. Set a non-default difficulty\n2. Save and quit\n3. Load the save",
      expected: "The difficulty matches what was set before saving",
    },
  ],
  Combat: [
    {
      title: "Melee weapon deals listed damage to an unshielded enemy",
      preconditions: "Player is alive with a melee weapon equipped and an unshielded enemy is nearby.",
      steps: "1. Equip a melee weapon\n2. Engage an unshielded enemy\n3. Land a hit",
      expected: "Damage dealt matches the weapon's listed value",
    },
    {
      title: "Parry window blocks incoming melee damage",
      preconditions: "Player is engaged with an enemy that has a telegraphed melee attack.",
      steps: "1. Face an attacking enemy\n2. Time a parry input on the incoming hit\n3. Confirm the outcome",
      expected: "Player takes zero damage and the enemy is staggered",
    },
  ],
  Movement: [
    {
      title: "Player does not clip through geometry when sprinting into a corner",
      preconditions: "Player has access to a tight interior corner and sprint enabled.",
      steps: "1. Sprint directly into a tight interior corner\n2. Observe collision behavior",
      expected: "Player collides with the corner normally with no clipping",
    },
    {
      title: "Double-jump input is not dropped after a wall-slide",
      preconditions: "Player has double-jump unlocked and access to a slidable wall surface.",
      steps: "1. Wall-slide down a surface\n2. Jump away from the wall\n3. Immediately press jump again",
      expected: "The double-jump triggers immediately with no dropped input",
    },
  ],
  AI: [
    {
      title: "Enemies path around destructible cover correctly",
      preconditions: "Player has access to an enemy and destructible cover geometry.",
      steps: "1. Place destructible cover between player and enemy\n2. Aggro the enemy",
      expected: "Enemy paths around or through cover without getting stuck",
    },
    {
      title: "Boss completes its second phase transition",
      preconditions: "Player is engaged in a boss encounter with a scripted phase-2 transition.",
      steps: "1. Reduce boss HP to the phase-2 threshold\n2. Observe the transition",
      expected: "Boss plays its phase-2 transition and enters phase 2",
    },
  ],
  Animation: [
    {
      title: "Reload animation cancels correctly when swapping weapons mid-animation",
      preconditions: "Player has two weapons equipped and one is mid-reload.",
      steps: "1. Start a reload\n2. Swap to the other weapon before it finishes\n3. Observe the animation",
      expected: "The reload animation cancels immediately on swap",
    },
    {
      title: "Idle-to-run transition does not flash a T-pose",
      preconditions: "Player character is standing still.",
      steps: "1. Stand still\n2. Start running\n3. Observe the transition frame",
      expected: "The transition blends smoothly with no bind-pose frame",
    },
  ],
  UI: [
    {
      title: "Health bar reflects current HP immediately after respawn",
      preconditions: "Player is in an active match with respawns enabled.",
      steps: "1. Reduce HP\n2. Die and respawn\n3. Check the health bar",
      expected: "Health bar shows full HP with no desync",
    },
    {
      title: "Inventory tooltip stays fully on-screen at 21:9",
      preconditions: "Display is configured for a 21:9 aspect ratio and the player has at least one item.",
      steps: "1. Switch display to 21:9\n2. Open inventory\n3. Hover an item",
      expected: "Tooltip renders fully within the visible screen area",
    },
  ],
  Networking: [
    {
      title: "Loot drops are not duplicated after a client desync",
      preconditions: "A multiplayer session with 2+ connected clients is active.",
      steps: "1. Start a session with 2+ clients\n2. Force a brief desync\n3. Trigger a loot drop",
      expected: "Exactly one loot instance is granted per drop",
    },
    {
      title: "Host migration completes without rubberbanding",
      preconditions: "A multiplayer session is active with the current player as host.",
      steps: "1. Start a session as host\n2. Disconnect the host client\n3. Observe migration to a new host",
      expected: "Players continue moving smoothly with no rubberbanding",
    },
  ],
  Physics: [
    {
      title: "Ragdolls stay above terrain on steep slopes",
      preconditions: "Player is positioned near a steep slope with an enemy nearby.",
      steps: "1. Defeat an enemy on a steep slope\n2. Observe the ragdoll settle",
      expected: "Ragdoll rests on the terrain surface without clipping through",
    },
    {
      title: "Vehicles remain stable on minor collisions",
      preconditions: "Player has access to a drivable vehicle and a small obstacle is nearby.",
      steps: "1. Drive a vehicle into a small obstacle at low speed\n2. Observe vehicle behavior",
      expected: "Vehicle absorbs the impact without flipping",
    },
  ],
  Audio: [
    {
      title: "Footstep audio plays correctly on metal surfaces",
      preconditions: "Player can walk onto a metal-surfaced area and audio output is enabled.",
      steps: "1. Walk onto a metal surface\n2. Listen for footstep audio",
      expected: "Metal-specific footstep audio plays on every step",
    },
    {
      title: "Music loop transitions without an audible pop",
      preconditions: "Background music is enabled and audio output is enabled.",
      steps: "1. Let background music play through a full loop\n2. Listen at the loop point",
      expected: "Loop transition is seamless with no audible pop",
    },
  ],
  Performance: [
    {
      title: "Frame rate stays above 30fps during a large particle effect",
      preconditions: "A frame rate counter is enabled and a large particle effect is available to trigger.",
      steps: "1. Trigger a large particle effect (e.g. an explosion)\n2. Monitor frame rate",
      expected: "Frame rate remains at or above 30fps",
    },
    {
      title: "Memory usage remains stable during a long play session",
      preconditions: "A memory usage monitor is available and the game can run continuously.",
      steps: "1. Play continuously for 2+ hours\n2. Monitor memory usage throughout",
      expected: "Memory usage stays within a stable range with no unbounded growth",
    },
  ],
  Graphics: [
    {
      title: "Distant foliage renders without flickering",
      preconditions: "Player is in an outdoor area with foliage in the distance.",
      steps: "1. View foliage at a distance\n2. Pan the camera slowly",
      expected: "Foliage renders stably with no flicker",
    },
    {
      title: "Shadows transition smoothly when rotating the camera near buildings",
      preconditions: "Player is near a building with dynamic shadows enabled.",
      steps: "1. Stand near a building\n2. Rotate the camera at close range",
      expected: "Shadows transition smoothly with no popping",
    },
  ],
  Input: [
    {
      title: "Controller vibration stops when switching to keyboard/mouse",
      preconditions: "Player is using a controller mid-session with vibration enabled.",
      steps: "1. Play with a controller\n2. Switch to keyboard/mouse\n3. Observe controller vibration",
      expected: "Controller vibration stops immediately on switch",
    },
    {
      title: "Rebound key bindings persist after relaunch",
      preconditions: "Player has rebound at least one key from its default.",
      steps: "1. Rebind a key\n2. Quit the game fully\n3. Relaunch and check the binding",
      expected: "The custom binding is restored exactly as configured",
    },
  ],
  Localization: [
    {
      title: "Subtitle text fits within the dialogue box in German",
      preconditions: "Game language is set to German and a dialogue line with a long translation is available.",
      steps: "1. Set language to German\n2. Trigger the dialogue line\n3. Observe the subtitle box",
      expected: "Subtitle text wraps or scales to stay fully within the dialogue box",
    },
    {
      title: "Store prices are formatted per regional locale",
      preconditions: "A non-default region is available to select and the in-game store is accessible.",
      steps: "1. Set a non-default region\n2. Open the in-game store\n3. Check price formatting",
      expected: "Prices use the correct currency symbol and separator for the selected region",
    },
  ],
  Accessibility: [
    {
      title: "Colorblind mode applies to enemy health bars",
      preconditions: "Colorblind mode is available and an enemy with a health bar is present.",
      steps: "1. Enable colorblind mode\n2. Engage an enemy\n3. Check the health bar colors",
      expected: "The health bar uses the colorblind-adjusted palette",
    },
    {
      title: "Subtitle size setting affects cutscene subtitles",
      preconditions: "A cutscene with subtitles is available to trigger.",
      steps: "1. Increase the subtitle size setting\n2. Play a cutscene with subtitles",
      expected: "Cutscene subtitles render at the increased size",
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
  await prisma.area.deleteMany();

  const areas = await Promise.all(AREA_DEFS.map((a) => prisma.area.create({ data: a })));

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

  // Each game supports its own subset of platforms — never every platform in
  // the enum. Voidrunner Protocol is console-only (no PC release planned);
  // Hollow Frontier is handheld/mobile-focused with no PlayStation release.
  const gameDefs = [
    {
      name: "King of Meat",
      slug: "king-of-meat",
      coverColor: "#2a78d6",
      releaseDate: new Date("2026-10-15"),
      platforms: [Platform.PC, Platform.XBOX, Platform.SWITCH],
    },
    {
      name: "Voidrunner Protocol",
      slug: "voidrunner-protocol",
      coverColor: "#6366f1",
      releaseDate: new Date("2027-02-20"),
      platforms: [Platform.PLAYSTATION, Platform.XBOX],
    },
    {
      name: "Hollow Frontier",
      slug: "hollow-frontier",
      coverColor: "#d6409f",
      releaseDate: new Date("2026-12-05"),
      platforms: [Platform.SWITCH, Platform.MOBILE],
    },
  ];
  const games = await Promise.all(
    gameDefs.map((def) =>
      prisma.game.create({
        data: {
          name: def.name,
          slug: def.slug,
          coverColor: def.coverColor,
          releaseDate: def.releaseDate,
          platforms: { create: def.platforms.map((platform) => ({ platform })) },
        },
      })
    )
  );
  const gamePlatforms = new Map<string, Platform[]>(games.map((g, i) => [g.id, gameDefs[i].platforms]));

  // Rotated per game so every BuildStatus value shows up somewhere in the
  // seeded data, not just a single hardcoded triple.
  const buildStatusProgressions: BuildStatus[][] = [
    [BuildStatus.DEPRECATED, BuildStatus.RELEASED, BuildStatus.BETA],
    [BuildStatus.RELEASED, BuildStatus.RELEASE_CANDIDATE, BuildStatus.QA],
    [BuildStatus.DEPRECATED, BuildStatus.QA, BuildStatus.INTERNAL],
  ];

  for (const [gameIndex, game] of games.entries()) {
    const buildVersions = ["0.9.10-beta", "0.9.12-beta", "0.9.14-beta"];
    const statusProgression = buildStatusProgressions[gameIndex % buildStatusProgressions.length];
    const builds = await Promise.all(
      buildVersions.map((version, i) =>
        prisma.build.create({
          data: {
            gameId: game.id,
            version,
            branch: i === buildVersions.length - 1 ? "release/beta" : "main",
            status: statusProgression[i],
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
      ].map((s) => {
        // A session starts sometime after its own build's release, not on
        // some unrelated random day — and runs a believable 2-8 hours, not
        // an arbitrary independently-rolled span that could even invert.
        const startedAt = new Date(s.build.releasedAt.getTime() + Math.floor(Math.random() * 6 * 3_600_000));
        const durationMs = (2 + Math.random() * 6) * 3_600_000;
        const endedAt = s.status === SessionStatus.COMPLETED ? new Date(startedAt.getTime() + durationMs) : null;
        return prisma.qASession.create({
          data: {
            gameId: game.id,
            buildId: s.build.id,
            name: s.name,
            status: s.status,
            startedAt,
            endedAt,
          },
        });
      })
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

    const gameBugs: Bug[] = [];
    const bugCount = 60 + Math.floor(Math.random() * 20);
    for (let i = 0; i < bugCount; i++) {
      const area = pick(areas);
      const bugDef = pick(BUG_DEFS[area.name]);
      const severity = pick(weightedPool);
      const priority = pick(priorityPool);
      const build = pick(builds);
      const session = pick(sessions);
      const status = pick(statusPool);
      const map = pick(MAPS);
      const gameMode = pick(GAME_MODES);
      // Each bug is filed against one of the specific platforms this game
      // actually supports — never assume every game supports every platform.
      const platform = pick(gamePlatforms.get(game.id)!);
      const isPC = platform === Platform.PC;

      // Spread discovery over the last ~6.5 weeks so weekly metrics (bugs
      // discovered/fixed this week) have real, non-uniform data to compute from.
      const discoveredDaysAgo = Math.floor(Math.random() * 46);
      const isResolved = !earlyPipelineStatuses.includes(status);
      // A resolved bug's updatedAt (its fix date) can only be on or after its
      // createdAt (its discovery date) — never before.
      const resolvedDaysAgo = isResolved
        ? Math.floor(Math.random() * (discoveredDaysAgo + 1))
        : discoveredDaysAgo;

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
            url: screenshotSvgDataUri({ title: bugDef.title, area: area.name, severity, buildVersion: build.version }),
            caption: s === 0 ? "Repro screenshot" : `Repro screenshot ${s + 1}`,
            fileName: `screenshot-${s + 1}.svg`,
          });
        }
        if (Math.random() < 0.4) {
          const logContent = generateLogContent({
            gameName: game.name,
            buildVersion: build.version,
            area: area.name,
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
            platform,
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
          description: `Observed in ${area.name} while testing ${game.name} on build ${build.version}. Needs triage confirmation.`,
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
          platform,
          severity,
          priority,
          status,
          isRegression: false,
          areaId: area.id,
          reportedById,
          assignedToId,
          tags: { connect: pickSome(tags, 2).map((t) => ({ id: t.id })) },
          evidence: { create: evidenceCreates },
          createdAt: daysAgo(discoveredDaysAgo),
          updatedAt: daysAgo(resolvedDaysAgo),
        },
      });
      gameBugs.push(bug);

      await prisma.activityEvent.createMany({
        data: buildActivityEvents({ bug, status, reportedById, assignedToId, leadTesterId: testers[0].id }).map(
          (e) => ({ ...e, bugId: bug.id })
        ),
      });
    }

    // A handful of confirmed regressions per game — a bug previously fixed
    // (FIXED/VERIFIED/CLOSED) that reproduces again in a later build. Backed
    // by a real REGRESSION_OF relationship rather than a freestanding flag,
    // so the detail page's regression banner has a real "fixed in / found
    // again in" build pair to show, not fabricated text.
    const fixedStatuses: BugStatus[] = [BugStatus.FIXED, BugStatus.VERIFIED, BugStatus.CLOSED];
    const fixedCandidates = gameBugs.filter((b) => {
      const buildIndex = builds.findIndex((bl) => bl.id === b.buildId);
      return fixedStatuses.includes(b.status) && buildIndex >= 0 && buildIndex < builds.length - 1;
    });
    const regressionCount = Math.min(fixedCandidates.length, 2 + Math.floor(Math.random() * 3));
    const regressionOrigins = [...fixedCandidates].sort(() => Math.random() - 0.5).slice(0, regressionCount);

    for (const original of regressionOrigins) {
      const originalBuildIndex = builds.findIndex((bl) => bl.id === original.buildId);
      const laterBuilds = builds.slice(originalBuildIndex + 1);
      const regressionBuild = pick(laterBuilds);
      const regressionSession = sessions[builds.indexOf(regressionBuild)] ?? pick(sessions);

      const reportedById = pick(testers).id;
      const assignedToId = Math.random() > 0.3 ? pick(testers).id : null;
      const regressionStatus = pick(earlyPipelineStatuses);

      // Must reproduce sometime after the original bug was marked fixed.
      const originalResolvedDaysAgo = Math.max(
        0,
        Math.floor((Date.now() - original.updatedAt.getTime()) / 86_400_000)
      );
      const regressionDaysAgo = Math.floor(Math.random() * originalResolvedDaysAgo);
      const originalArea = areas.find((a) => a.id === original.areaId);

      const regressionBug = await prisma.bug.create({
        data: {
          gameId: game.id,
          buildId: regressionBuild.id,
          sessionId: regressionSession.id,
          title: original.title,
          description: `Regression: previously fixed in build ${builds[originalBuildIndex].version}, now reproducing again in build ${regressionBuild.version}.`,
          stepsToReproduce: original.stepsToReproduce,
          expectedResult: original.expectedResult,
          actualResult: original.actualResult,
          map: original.map,
          gameMode: original.gameMode,
          environmentOS: original.environmentOS,
          environmentGpu: original.environmentGpu,
          platform: original.platform,
          severity: original.severity,
          priority: original.priority,
          status: regressionStatus,
          isRegression: true,
          areaId: original.areaId,
          reportedById,
          assignedToId,
          evidence: {
            create: [
              {
                type: EvidenceType.IMAGE,
                url: screenshotSvgDataUri({
                  title: original.title,
                  area: originalArea?.name ?? "",
                  severity: original.severity,
                  buildVersion: regressionBuild.version,
                }),
                caption: "Repro screenshot",
                fileName: "screenshot-1.svg",
              },
            ],
          },
          createdAt: daysAgo(regressionDaysAgo),
          updatedAt: daysAgo(regressionDaysAgo),
        },
      });

      await prisma.bugRelationship.create({
        data: { type: RelationshipType.REGRESSION_OF, sourceBugId: regressionBug.id, targetBugId: original.id },
      });

      await prisma.activityEvent.createMany({
        data: buildActivityEvents({
          bug: regressionBug,
          status: regressionStatus,
          reportedById,
          assignedToId,
          leadTesterId: testers[0].id,
        }).map((e) => ({ ...e, bugId: regressionBug.id })),
      });
    }

    const testCasePriorityPool: TestCasePriority[] = [
      ...Array(2).fill(TestCasePriority.CRITICAL),
      ...Array(6).fill(TestCasePriority.HIGH),
      ...Array(9).fill(TestCasePriority.MEDIUM),
      ...Array(3).fill(TestCasePriority.LOW),
    ];

    const testCases = await Promise.all(
      areas.flatMap((area) =>
        TEST_CASE_TEMPLATES[area.name].map((tc) =>
          prisma.testCase.create({
            data: {
              gameId: game.id,
              title: tc.title,
              description: `Regression check for ${area.name.toLowerCase()} systems.`,
              preconditions: tc.preconditions,
              steps: tc.steps,
              expected: tc.expected,
              categoryId: area.id,
              priority: pick(testCasePriorityPool),
              platform: pick(gamePlatforms.get(game.id)!),
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

  // Default release requirements — editable afterward on the Settings page,
  // never hardcoded again once these rows exist.
  await prisma.qualityGate.createMany({
    data: [
      { metric: QualityGateMetric.CRITICAL_BUGS, operator: GateOperator.EQUAL, threshold: 0 },
      { metric: QualityGateMetric.TEST_PASS_RATE, operator: GateOperator.GREATER_THAN, threshold: 95 },
      { metric: QualityGateMetric.REGRESSION_RATE, operator: GateOperator.LESS_THAN, threshold: 2 },
      { metric: QualityGateMetric.COVERAGE, operator: GateOperator.GREATER_THAN, threshold: 90 },
      { metric: QualityGateMetric.PERFORMANCE, operator: GateOperator.GREATER_THAN, threshold: 85 },
    ],
  });

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
