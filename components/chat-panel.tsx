import { buildTwitchChatUrl } from "@/lib/twitch-config";
import type { ViewerPlayer } from "@/types/viewer";
import { cn } from "@/lib/cn";
import styles from "@/styles/chat-panel.module.scss";

interface ChatPanelProps {
  players: ViewerPlayer[];
  selectedChatPlayerId: string | null;
  defaultChatPlayerId: string | null;
  onChangeChat: (playerId: string | null) => void;
  onCycleChat: (direction: -1 | 1) => void;
}

export function ChatPanel({
  players,
  selectedChatPlayerId,
  defaultChatPlayerId,
  onChangeChat,
  onCycleChat,
}: ChatPanelProps) {
  const activeChatPlayer =
    players.find((player) => player.id === selectedChatPlayerId) ??
    players.find((player) => player.id === defaultChatPlayerId) ??
    players[0] ??
    null;

  return (
    <section className={cn(styles.sidebarSection, styles.chatSection)}>
      {activeChatPlayer ? (
        <>
          <div className={styles.chatToolbar}>
            <button onClick={() => onCycleChat(-1)} type="button">
              Prev
            </button>
            <select
              aria-label="Active chat stream"
              onChange={(event) => onChangeChat(event.target.value || null)}
              value={activeChatPlayer.id}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.channel}
                </option>
              ))}
            </select>
            <button onClick={() => onCycleChat(1)} type="button">
              Next
            </button>
          </div>

          <div className={styles.chatPanelBody}>
            <div className={styles.chatFrameStack}>
              {players.map((player) => {
                const isActive = player.id === activeChatPlayer.id;

                return (
                  <iframe
                    aria-hidden={!isActive}
                    className={cn(
                      styles.chatFrame,
                      isActive && styles.chatFrameActive,
                    )}
                    key={player.id}
                    src={buildTwitchChatUrl(player.channel)}
                    tabIndex={isActive ? 0 : -1}
                    title={`${player.channel} Twitch chat`}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.sectionEmptyState}>
          <p>Chat becomes available as soon as you add your first stream.</p>
        </div>
      )}
    </section>
  );
}
