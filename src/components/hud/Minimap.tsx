"use client";

import { useEffect, useRef } from "react";
import { player } from "@/lib/interaction";
import { BARN_POS, BOARD_POS, MARKET_POS, PEN, POND, WORLD_HALF, fieldSize, FIELD_CENTER } from "@/components/three/layout";

const SIZE = 132;
const toMap = (v: number) => ((v + WORLD_HALF) / (WORLD_HALF * 2)) * SIZE;
const len = (v: number) => (v / (WORLD_HALF * 2)) * SIZE;

/** Top-down map of the farm. The player dot is moved via rAF (no React re-render per frame). */
export function Minimap({ plotCount, readyCount }: { plotCount: number; readyCount: number }) {
  const dot = useRef<SVGCircleElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      dot.current?.setAttribute("cx", String(toMap(player.x)));
      dot.current?.setAttribute("cy", String(toMap(player.z)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const [fw, fd] = fieldSize(plotCount);

  return (
    <div className="pointer-events-none overflow-hidden rounded-2xl border-4 border-white/90 bg-grass-300/90 shadow-chunky backdrop-blur">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="Farm map">
        <rect width={SIZE} height={SIZE} fill="#8fcf52" />
        {/* paths */}
        <rect x={toMap(-0.9)} y={toMap(-7)} width={len(1.8)} height={len(19)} fill="#d9b27a" />
        <rect x={toMap(-7.25)} y={toMap(-5.5)} width={len(15)} height={len(1.8)} fill="#d9b27a" />
        {/* field */}
        <rect x={toMap(FIELD_CENTER[0] - fw / 2)} y={toMap(FIELD_CENTER[1] - fd / 2)} width={len(fw)} height={len(fd)} rx={2} fill="#8a5d35" />
        {/* pen */}
        <rect x={toMap(PEN.x - PEN.w / 2)} y={toMap(PEN.z - PEN.d / 2)} width={len(PEN.w)} height={len(PEN.d)} rx={2} fill="#a8c86a" stroke="#6d4726" strokeWidth={1.5} />
        {/* barn + market */}
        <rect x={toMap(BARN_POS[0] - 1.5)} y={toMap(BARN_POS[2] - 1.2)} width={len(3)} height={len(2.4)} fill="#c0392b" />
        <text x={toMap(MARKET_POS[0] - 2.6)} y={toMap(MARKET_POS[2] + 1.2)} fontSize="10" textAnchor="middle">🛒</text>
        <text x={toMap(BOARD_POS[0])} y={toMap(BOARD_POS[2] + 0.9)} fontSize="9" textAnchor="middle">📋</text>
        {/* pond */}
        <circle cx={toMap(POND.x)} cy={toMap(POND.z)} r={len(POND.r)} fill="#55b9f5" />
        {/* player */}
        <circle ref={dot} r={4} fill="#ffcc22" stroke="#ffffff" strokeWidth={2} />
      </svg>
      {readyCount > 0 && (
        <div className="bg-sun-400 px-2 py-0.5 text-center font-display text-[11px] font-extrabold text-soil-600">{readyCount} ready to harvest</div>
      )}
    </div>
  );
}
