"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ProcessDef, ProcessSeconds } from "@/lib/types";
import { secondsToClock } from "@/lib/time";

export default function ProcessRadarChart({
  processDefs,
  processes,
  color = "#0071e3",
}: {
  processDefs: ProcessDef[];
  processes: ProcessSeconds;
  color?: string;
}) {
  const hasTarget = processDefs.some((d) => d.targetSeconds);

  // 分単位で表示(秒のままだと目盛りが読みにくいため)
  const data = processDefs.map((def) => ({
    name: def.label,
    実測: Math.round(((processes[def.id] || 0) / 60) * 10) / 10,
    実測秒: processes[def.id] || 0,
    目標: def.targetSeconds
      ? Math.round((def.targetSeconds / 60) * 10) / 10
      : undefined,
    目標秒: def.targetSeconds,
  }));

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.実測 || 0, d.目標 || 0))
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#1d1d1f1f" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: "#6e6e73" }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, Math.ceil(max * 1.2)]}
            tick={{ fontSize: 10, fill: "#6e6e73" }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              const seconds =
                name === "目標"
                  ? (item.payload as any).目標秒
                  : (item.payload as any).実測秒;
              return [secondsToClock(seconds || 0), name as string];
            }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #1d1d1f1f",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Radar
            name="実測"
            dataKey="実測"
            stroke={color}
            fill={color}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          {hasTarget && (
            <Radar
              name="目標"
              dataKey="目標"
              stroke="#ff3b30"
              fill="none"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
