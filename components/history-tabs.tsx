"use client";

import { useState } from "react";
import type { QueueTask } from "@/lib/types";

function List({ tasks, received }: { tasks: QueueTask[]; received: boolean }) {
  if (!tasks.length) return <div className="empty">No finished reviews {received ? "received" : "given"} yet.</div>;
  return <div className="history-list">{tasks.map((task, index) => {
    const completed = task.status === "completed";
    const date = new Date(task.completed_at || task.accepted_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return <article key={task.id}><div className={`history-art history-art-${index % 3 + 1}`} aria-hidden="true" /><div className="history-copy"><h2>{task.business_name}</h2><div className="history-date">{date} · {task.business_city}</div><span className={completed ? "history-status" : "history-status expired"}>{completed ? "Completed" : "Expired"}</span>{completed && task.proof_url ? <a target="_blank" rel="noreferrer" href={task.proof_url}>View review URL ↗</a> : null}</div><strong className="history-points">{completed ? received ? "🌟" : "+1 🌟" : "⏱️"}</strong></article>;
  })}</div>;
}

export function HistoryTabs({ given, received }: { given: QueueTask[]; received: QueueTask[] }) {
  const [tab, setTab] = useState<"given" | "received">("given");
  return <><div className="tabs"><button type="button" className={tab === "given" ? "active" : ""} onClick={() => setTab("given")}>My Gives</button><button type="button" className={tab === "received" ? "active" : ""} onClick={() => setTab("received")}>My Receives</button></div>{tab === "given" ? <List tasks={given} received={false} /> : <List tasks={received} received />}</>;
}
