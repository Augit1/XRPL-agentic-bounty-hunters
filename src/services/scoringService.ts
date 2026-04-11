import { ContributionScoreInput } from "../types";

export class ScoringService {
  validateScores(scores: ContributionScoreInput[]): Map<string, number> {
    const mapped = new Map<string, number>();

    for (const entry of scores) {
      if (!entry.contributionId) {
        throw new Error("Each score entry must include a contributionId");
      }

      if (!Number.isFinite(entry.score) || entry.score < 0) {
        throw new Error(`Invalid score for contribution ${entry.contributionId}`);
      }

      mapped.set(entry.contributionId, entry.score);
    }

    return mapped;
  }
}
