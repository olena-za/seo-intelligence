export interface SectionDiff {
  title: string;
  type: 'added' | 'removed' | 'changed';
  oldText?: string;
  newText?: string;
}

export function detectChangedSections(
  previous: string[],
  current: string[],
): SectionDiff[] {
  const diffs: SectionDiff[] = [];
  const previousSet = new Set(previous);
  const currentSet = new Set(current);

  for (const title of current) {
    if (!previousSet.has(title)) {
      diffs.push({ title, type: 'added', newText: title });
    }
  }

  for (const title of previous) {
    if (!currentSet.has(title)) {
      diffs.push({ title, type: 'removed', oldText: title });
    }
  }

  return diffs;
}
