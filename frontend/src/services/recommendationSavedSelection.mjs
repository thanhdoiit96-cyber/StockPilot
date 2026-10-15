export function resolveLatestSavedSnapshot(snapshots = [], currentSelectedId = '') {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;

  const normalized = snapshots
    .filter(Boolean)
    .map(snapshot => ({
      ...snapshot,
      createdAt: snapshot.createdAt || snapshot.created_at || new Date(0).toISOString(),
      id: snapshot.id == null ? null : String(snapshot.id)
    }))
    .filter(snapshot => snapshot.id && snapshot.createdAt);

  if (!normalized.length) return null;

  const latest = [...normalized].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];
  if (!currentSelectedId) return latest;

  const selected = normalized.find(snapshot => String(snapshot.id) === String(currentSelectedId));
  if (!selected) return latest;

  return new Date(selected.createdAt).getTime() >= new Date(latest.createdAt).getTime() ? selected : latest;
}
