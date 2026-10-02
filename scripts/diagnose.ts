/**
 * pnpm diagnose: what this machine has and lacks, one line each, without installing anything.
 * (Not `pnpm doctor`: that is pnpm's own command.) `pnpm bootstrap` installs what is missing.
 */
import { chromeStatus, depsStatus, llmStatus, nodeStatus, printChecks, rhubarbStatus, ttsStatus } from "./lib/doctor";

const checks = [nodeStatus(), depsStatus(), rhubarbStatus().check, chromeStatus(), ttsStatus(), llmStatus()];
printChecks(checks);
process.exit(checks.some((c) => c.status === "fail") ? 1 : 0);
