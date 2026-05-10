import { Button } from '../ui/Button';

interface ActionBarProps {
  canPlay: boolean;
  selectedCount: number;
  onPlay: () => void;
  onPass: () => void;
  onHint: () => void;
  canLock?: boolean;
  canUnlock?: boolean;
  onLock?: () => void;
  onUnlock?: () => void;
}

export function ActionBar({
  canPlay,
  selectedCount,
  onPlay,
  onPass,
  onHint,
  canLock = false,
  canUnlock = false,
  onLock,
  onUnlock,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3">
      <Button
        variant="ghost"
        size="md"
        onClick={onHint}
        disabled={!canPlay}
        className="text-white/60 hover:text-white hover:bg-white/10"
      >
        提示
      </Button>
      {canUnlock && onUnlock ? (
        <Button
          variant="outline"
          size="md"
          onClick={onUnlock}
          className="border-amber-400/40 text-amber-300/80 hover:bg-amber-400/10 hover:border-amber-400/60"
        >
          解锁
        </Button>
      ) : canLock && onLock ? (
        <Button
          variant="outline"
          size="md"
          onClick={onLock}
          disabled={!canPlay}
          className="border-amber-400/25 text-amber-300/70 hover:bg-amber-400/10 hover:border-amber-400/40"
        >
          锁牌
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="md"
        onClick={onPass}
        disabled={!canPlay}
        className="border-white/25 text-white/70 hover:bg-white/10 hover:border-white/40"
      >
        过牌
      </Button>
      <Button
        variant="primary"
        size="lg"
        onClick={onPlay}
        disabled={!canPlay || selectedCount === 0}
      >
        {selectedCount > 0 ? `出牌 (${selectedCount})` : '出牌'}
      </Button>
    </div>
  );
}
