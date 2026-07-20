"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ProcessDef, ProcessSeconds } from "@/lib/types";
import { secondsToClock } from "@/lib/time";

export default function ProcessBarChart({
  processDefs,
  processes,
}: {
  processDefs: ProcessDef[];
  processes: ProcessSeconds;
}) {
  const hasTarget = processDefs.some((d) => d.targetSeconds);
  const data = processDefs.map((def) => ({
    name: def.label,
    minutes: Math.round(((processes[def.id] || 0) / 60) * 10) / 10,
    seconds: processes[def.id] || 0,
    targetMinutes: def.targetSeconds
      ? Math.round((def.targetSeconds / 60) * 10) / 10
      : undefined,
    targetSeconds: def.targetSeconds,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1d1d1f14" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6e6e73" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#6e6e73" }}
            label={{ value: "分", position: "insideTopLeft", fontSize: 11, fill: "#6e6e73" }}
          />
          <Tooltip
            formatter={(value, name, item) => {
              if (name === "targetMinutes") {
                return [
                  secondsToClock((item.payload as any).targetSeconds || 0),
                  "目標タイム",
                ];
              }
              return [secondsToClock((item.payload as any).seconds), "所要時間"];
            }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #1d1d1f1f",
              fontSize: 12,
            }}
          />
          {hasTarget && (
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) =>
                value === "minutes" ? "実測" : "目標タイム"
              }
            />
          )}
          <Bar dataKey="minutes" fill="#0071e3" radius={[3, 3, 0, 0]} />
          {hasTarget && (
            <Line
              dataKey="targetMinutes"
              stroke="#ff3b30"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: "#ff3b30", strokeWidth: 0 }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
