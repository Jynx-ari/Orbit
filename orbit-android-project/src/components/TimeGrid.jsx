import { useEffect, useRef, useState } from "react";
import { WEEKDAYS, formatHour, pad, toKey } from "../lib/dates.js";
import { dayBlocks, isBanner, occsOnDay, timeLabel } from "../lib/events.js";
import useTodayKey from "../lib/useTodayKey.js";
import EventChip from "./EventChip.jsx";

const HOUR_PX = 48;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Used for both the week view (7 days) and the day view (1 day).
export default function TimeGrid({ days, occs, catColor, hour24, selectedKey, onSelectDay, onOpen, onCreate }) {
  const scrollRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const todayKey = useTodayKey();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_PX - 8;
  }, []);

  const nowTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;

  return (
    <div className="timegrid" style={{ "--cols": days.length }}>
      <div className="tg-row tg-head">
        <div className="tg-gutter" />
        {days.map((d) => {
          const key = toKey(d);
          return (
            <button
              type="button"
              key={key}
              className={`tg-dayhead${key === todayKey ? " today" : ""}${key === selectedKey ? " selected" : ""}`}
              onClick={() => onSelectDay(key)}
              aria-label={d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            >
              <span>{WEEKDAYS[d.getDay()]}</span>
              <strong>{d.getDate()}</strong>
            </button>
          );
        })}
      </div>

      <div className="tg-row tg-allday">
        <div className="tg-gutter">all-day</div>
        {days.map((d) => {
          const key = toKey(d);
          const banners = occsOnDay(occs, key).filter(isBanner);
          return (
            <div className="tg-allday-cell" key={key} onDoubleClick={() => onCreate(key, { allDay: true })}>
              {banners.map((o) => (
                <EventChip key={o.key} occ={o} day={key} color={catColor(o.category)} hour24={hour24} onOpen={onOpen} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="tg-scroll" ref={scrollRef}>
        <div className="tg-body" style={{ height: 24 * HOUR_PX }}>
          <div className="tg-gutter">
            {HOURS.slice(1).map((h) => (
              <span key={h} style={{ top: h * HOUR_PX }}>{formatHour(h, hour24)}</span>
            ))}
          </div>
          {days.map((d) => {
            const key = toKey(d);
            const blocks = dayBlocks(occsOnDay(occs, key));
            return (
              <div
                key={key}
                className="tg-col"
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_PX)));
                  onCreate(key, { startTime: `${pad(hour)}:00` });
                }}
              >
                {blocks.map(({ occ, start, end, col, cols }) => (
                  <button
                    type="button"
                    key={occ.key}
                    className="tg-block"
                    title={`${occ.title} — ${timeLabel(occ, hour24)}`}
                    style={{
                      "--chip": catColor(occ.category),
                      top: (start / 60) * HOUR_PX,
                      height: ((end - start) / 60) * HOUR_PX - 2,
                      left: `calc(${(col * 100) / cols}% + 1px)`,
                      width: `calc(${100 / cols}% - 3px)`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onOpen(occ); }}
                  >
                    <strong>{occ.title}</strong>
                    <span>{timeLabel(occ, hour24)}</span>
                  </button>
                ))}
                {key === todayKey && <div className="tg-now" style={{ top: nowTop }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
