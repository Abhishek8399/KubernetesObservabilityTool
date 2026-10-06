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
  const [view, setView] = useState<"story" | "check" | "practice" | "manifest">(
      "story",
    ),
    [choice, setChoice] = useState<number | null>(null);
  const lesson = p.stop.lesson!;
  return (
    <div className="lesson-checkpoint">
      <nav aria-label="Learning milestone sections">
        {(
          [
            "story",
            "check",
            "practice",
            ...(lesson.story?.manifest ? ["manifest" as const] : []),
          ] as const
        ).map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
          >
            {tab === "story"
              ? "1 · Understand"
              : tab === "check"
                ? "2 · Check understanding"
                : tab === "practice"
                  ? "3 · Practice in a sandbox"
                  : "Example YAML"}
            {tab === "check" && p.checked && " ✓"}
          </button>
        ))}
      </nav>
      {view === "story" ? (
        <div>
          <small>
            {lesson.story?.chapter.toUpperCase()} · THE QUESTION BEHIND THIS
            MILESTONE
          </small>
          <h2>{lesson.story?.question ?? lesson.question}</h2>
          <p className="story-answer">{lesson.story?.answer ?? p.stop.body}</p>
          {lesson.story && (
            <div className="story-decisions">
              <details>
                <summary>
                  What if I skip this or choose the wrong approach?
                </summary>
                <p>{lesson.story.without}</p>
              </details>
              <details>
                <summary>What do I create or configure?</summary>
                <p>{lesson.story.create}</p>
              </details>
              <details>
                <summary>What should I see happening?</summary>
                <p>{lesson.story.observe}</p>
              </details>
              <div className="story-next">
                <small>THE NEXT QUESTION</small>
                <p>{lesson.story.next}</p>
              </div>
            </div>
          )}
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
      ) : view === "manifest" ? (
        <div className="story-manifest">
          <small>ILLUSTRATIVE SANDBOX CONFIGURATION</small>
          <h2>Connect the explanation to the YAML</h2>
          <p>
            This is a learning sketch, not a production template. Replace
            example images, ports, endpoints and platform prerequisites with
            verified application values. This tool does not apply it.
          </p>
          <pre>
            <code>{lesson.story?.manifest}</code>
          </pre>
          <p>
            Review the matching resource configuration and diagnostics for
            implementation-specific requirements.
          </p>
          <button className="lesson-check-link" onClick={p.onExample}>
            Inspect the resource details →
          </button>
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
          {p.index >= 15 && (
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
