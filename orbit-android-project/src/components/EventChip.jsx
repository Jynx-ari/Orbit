import { formatTime } from "../lib/dates.js";
import { isBanner, timeLabel } from "../lib/events.js";

export default function EventChip({ occ, day, color, hour24, onOpen, draggable = false }) {
  const continues = occ.startKey !== day;
  const time = !isBanner(occ) ? formatTime(occ.startTime, hour24) : "";
  return (
    <button
      type="button"
      className={`event-chip${continues ? " continues" : ""}`}
      style={{ "--chip": color }}
      title={`${occ.title} — ${timeLabel(occ, hour24)}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `${occ.id}|${day}`);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(occ);
      }}
    >
      {time && <span className="chip-time">{time}</span>}
      <span className="chip-title">{occ.title}</span>
    </button>
  );
}
