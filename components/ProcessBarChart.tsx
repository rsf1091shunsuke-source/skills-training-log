"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
  const data = processDefs.map((def) => ({
    name: def.label,
    minutes: Math.round(((processes[def.id] || 0) / 60) * 10) / 10,
    seconds: processes[def.id] || 0,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c191720" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#3a3532" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#3a3532" }}
            label={{ value: "分", position: "insideTopLeft", fontSize: 11, fill: "#3a3532" }}
          />
          <Tooltip
            formatter={(_value, _name, item) => [
              secondsToClock((item.payload as any).seconds),
              "所要時間",
            ]}
            contentStyle={{
              background: "#ece4d0",
              border: "1px solid #1c191733",
              fontSize: 12,
            }}
          />
          <Bar dataKey="minutes" fill="#a97c50" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
