// The database access layer, split by domain (see the sibling files in this
// folder) instead of one growing file — each module owns the Prisma queries
// for one part of the product (bugs, builds, sessions, ...). This barrel is
// the stable import surface every page/component/action uses
// (`from "@/lib/db"`); the actual implementation lives in the files below.
export * from "./games";
export * from "./builds";
export * from "./test-cases";
export * from "./sessions";
export * from "./testers";
export * from "./coverage";
export * from "./dashboard";
export * from "./bugs";
export * from "./analytics";
export * from "./reports";
export * from "./notifications";
