import { inputClass, labelClass } from "@/components/bugs/bug-create-form-shared";
import type { GameCreateOption } from "@/lib/db";

export function BugCreateBasicsFields({
  games,
  selectedGameId,
  onGameChange,
  selectedGame,
  buildId,
  onBuildChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: {
  games: GameCreateOption[];
  selectedGameId: string;
  onGameChange: (gameId: string) => void;
  selectedGame: GameCreateOption;
  buildId: string;
  onBuildChange: (buildId: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="bug-game">Game</label>
          <select id="bug-game" value={selectedGameId} onChange={(e) => onGameChange(e.target.value)} className={inputClass}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="bug-build">Build</label>
          <select id="bug-build" value={buildId} onChange={(e) => onBuildChange(e.target.value)} className={inputClass}>
            {selectedGame.builds.length === 0 ? (
              <option value="">No builds yet</option>
            ) : (
              selectedGame.builds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.version}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="bug-title">Title</label>
        <input
          id="bug-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className={inputClass}
          placeholder="e.g. Player falls through the warehouse floor"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="bug-description">Description</label>
        <textarea id="bug-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3} className={inputClass} />
      </div>
    </>
  );
}
