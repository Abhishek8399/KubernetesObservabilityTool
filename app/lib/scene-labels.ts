export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SceneLabel {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  above: number;
  priority: number;
}
export interface PlacedLabel extends SceneLabel {
  box: LabelBox;
}

export function overlaps(a: LabelBox, b: LabelBox, gap = 5) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/** Show readable names only where they fit. Full roles stay in hover/focus details. */
export function placeLabels(
  labels: SceneLabel[],
  width: number,
  height: number,
  objects: LabelBox[],
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const label of [...labels].sort(
    (a, b) => b.priority - a.priority || a.y - b.y || a.id.localeCompare(b.id),
  )) {
    if (![label.x, label.y, label.above].every(Number.isFinite)) continue;
    const w = label.text.length * 8.4 + 20;
    const h = 24;
    const candidates = [
      [label.x - w / 2, label.y + 25],
      [label.x - w / 2, label.above - h - 10],
      [label.x - w / 2, label.y + 49],
      [label.x + 36, label.y + 15],
      [label.x - w - 36, label.y + 15],
    ];
    for (const [x, y] of candidates) {
      const box = { x, y, width: w, height: h };
      if (x < 10 || y < 10 || x + w > width - 10 || y + h > height - 10)
        continue;
      if (
        objects.some((object) => overlaps(box, object)) ||
        placed.some((other) => overlaps(box, other.box))
      )
        continue;
      placed.push({ ...label, box });
      break;
    }
  }
  return placed;
}

export function readableName(label: string) {
  const acronyms = new Set(["API", "DNS", "ETCD", "GPU", "PVC", "WAF", "LB"]);
  return label
    .split(" ")
    .map((word) =>
      acronyms.has(word) || /\d/.test(word)
        ? word
        : word === "GITOPS"
          ? "GitOps"
          : word.charAt(0) + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
