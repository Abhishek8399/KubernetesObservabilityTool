"use client";
import { useState } from "react";
import type { FlightStop } from "./lib/flight";
export default function LessonCheckpoint(p: {
  stop: FlightStop;
  checked: boolean;
  onAnswer: (choice: number) => void;
  onExample: () => void;
  onFailure: () => void;
  index: number;
}) {
  const [view, setView] = useState<"story" | "check" | "practice">("story"),
    [choice, setChoice] = useState<number | null>(null);
  const lesson = p.stop.lesson!;
  return (
    <div className="lesson-checkpoint">
      <nav aria-label="Learning milestone sections">
        {(["story", "check", "practice"] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
          >
            {tab === "story"
              ? "1 · Understand"
              : tab === "check"
                ? "2 · Check understanding"
                : "3 · Practice in a sandbox"}
            {tab === "check" && p.checked && " ✓"}
          </button>
        ))}
      </nav>
      {view === "story" ? (
        <div>
          <small>THE QUESTION BEHIND THIS MILESTONE</small>
          <h2>{lesson.question}</h2>
          <p>{p.stop.body}</p>
          <button
            className="lesson-check-link"
            onClick={() => setView("check")}
          >
            Check your understanding →
          </button>
        </div>
      ) : view === "check" ? (
        <div className="lesson-quiz">
          <h2>{lesson.question}</h2>
          <div role="group" aria-label="Understanding check answers">
            {lesson.choices.map((text, i) => (
              <button
                key={i}
                className={
                  choice === i
                    ? i === lesson.answer
                      ? "correct"
                      : "incorrect"
                    : ""
                }
                aria-pressed={choice === i}
                onClick={() => {
                  setChoice(i);
                  p.onAnswer(i);
                }}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {text}
              </button>
            ))}
          </div>
          <p role="status" className="lesson-feedback">
            {choice === null
              ? p.checked
                ? "Already checked. Revisit the question or continue to the next milestone."
                : "Choose the answer that explains the resource's responsibility."
              : choice === lesson.answer
                ? `Correct. ${lesson.explanation}`
                : `That owner or behavior does not match this stage. ${lesson.explanation}`}
          </p>
        </div>
      ) : (
        <div className="lesson-practice">
          <small>HANDS-ON EVIDENCE · YOUR DISPOSABLE SANDBOX</small>
          <h2>Turn understanding into an observed result</h2>
          <p>{lesson.exercise}</p>
          <code>{lesson.verify}</code>
          <button className="lesson-check-link" onClick={p.onExample}>
            Open resource configuration and diagnostics →
          </button>
          {[15, 16, 17, 18, 19].includes(p.index) && (
            <button className="lesson-check-link" onClick={p.onFailure}>
              Open a guided failure or rollout simulation →
            </button>
          )}
          <small>
            These are exercises to perform in your sandbox. This application
            does not execute kubectl or modify a cluster.
          </small>
        </div>
      )}
    </div>
  );
}
