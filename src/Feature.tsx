import { useEffect, useState } from "react";
import {
  QRExchange,
  makeScanPayload,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
const NAME_KEY = (p: string) => `${p}:displayName`;

const PROMPTS = [
  "speaks 3+ languages",
  "born outside this country",
  "owns a vinyl player",
  "has a pet with a weird name",
  "ran a marathon",
  "wrote a book or article",
  "has been awake 24h+",
  "knits or crochets",
  "shipped a side project",
  "plays an instrument",
  "rides a motorcycle",
  "lived abroad 6mo+",
  "FREE — it's you",
  "vegetarian",
  "grew up rural",
  "speaks at conferences",
  "has a tattoo",
  "ham radio licensed",
  "marathon binge-watched a show",
  "owns a 3D printer",
  "has been on TV",
  "skydived",
  "older sibling",
  "uses vim",
  "broke a bone climbing/skating",
];

type Mark = { peerId: string; name: string; ts: number };

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="viral-screen">
        <h1>icebreaker bingo</h1>
        <p className="viral-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [, rerender] = useState(0);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const boards = room.doc.getMap<Record<string, Mark>>("boards");
    const names = room.doc.getMap<string>("names");
    const cb = () => rerender((n) => n + 1);
    boards.observe(cb);
    names.observe(cb);
    return () => {
      boards.unobserve(cb);
      names.unobserve(cb);
    };
  }, [room]);

  const boards = room.doc.getMap<Record<string, Mark>>("boards");
  const names = room.doc.getMap<string>("names");

  useEffect(() => {
    if (name.trim()) names.set(room.peerId, name.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, room.peerId]);

  const myBoard = boards.get(room.peerId) ?? {};

  const markSquare = (idx: number, peerId: string, peerName: string) => {
    if (peerId === room.peerId) return;
    const next: Record<string, Mark> = { ...myBoard };
    next[String(idx)] = { peerId, name: peerName, ts: Date.now() };
    boards.set(room.peerId, next);
    setSelected(null);
  };

  const onScan = (peerId: string, peerName: string) => {
    if (selected === null) return;
    markSquare(selected, peerId, peerName);
  };

  const grid = 5;
  const checkBingo = (b: Record<string, Mark>): number => {
    // returns number of completed lines
    const marked = (i: number) => i === 12 || !!b[String(i)]; // center is free
    let lines = 0;
    for (let r = 0; r < grid; r++) {
      let ok = true;
      for (let c = 0; c < grid; c++) if (!marked(r * grid + c)) ok = false;
      if (ok) lines++;
    }
    for (let c = 0; c < grid; c++) {
      let ok = true;
      for (let r = 0; r < grid; r++) if (!marked(r * grid + c)) ok = false;
      if (ok) lines++;
    }
    let okA = true;
    for (let i = 0; i < grid; i++) if (!marked(i * grid + i)) okA = false;
    if (okA) lines++;
    let okB = true;
    for (let i = 0; i < grid; i++) if (!marked(i * grid + (grid - 1 - i))) okB = false;
    if (okB) lines++;
    return lines;
  };

  const myLines = checkBingo(myBoard);
  const filled = Object.keys(myBoard).length + 1; // +1 for free center

  const myPayload = makeScanPayload(room.roomId, room.peerId, name.trim() || "anon");

  return (
    <div className="viral-screen">
      <header>
        <h1>icebreaker bingo</h1>
        <p className="viral-status">
          {filled}/25 marked · {myLines} {myLines === 1 ? "bingo" : "bingos"} · {room.peerCount + 1}{" "}
          present
        </p>
      </header>

      <input
        className="viral-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="your name"
        maxLength={48}
        aria-label="your name"
      />

      {myLines > 0 && (
        <div className="bg-win">
          🎉 BINGO! ({myLines} {myLines === 1 ? "line" : "lines"})
        </div>
      )}

      <p className="viral-section-title">tap a prompt → then scan the person who fits</p>

      <div className="bg-board">
        {PROMPTS.slice(0, 25).map((p, i) => {
          const isCenter = i === 12;
          const mark = myBoard[String(i)];
          const isSel = selected === i;
          return (
            <button
              key={i}
              type="button"
              className={`bg-cell ${isCenter ? "is-free" : ""} ${mark ? "is-marked" : ""} ${isSel ? "is-selected" : ""}`}
              onClick={() => {
                if (isCenter || mark) return;
                setSelected(isSel ? null : i);
              }}
            >
              <span className="bg-prompt">{p}</span>
              {mark && <span className="bg-by">✓ {mark.name}</span>}
            </button>
          );
        })}
      </div>

      <QRExchange
        myPayload={myPayload}
        showLabel="your QR — show this when you match a prompt for someone"
        scanLabel={selected === null ? "pick a square first" : "scan the matcher"}
        onScan={(parsed) => onScan(parsed.peerId, parsed.extra ?? "anon")}
      />
    </div>
  );
}
