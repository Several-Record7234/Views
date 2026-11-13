/**
 * One entry per `id`, keeping the first, in order. An account signed in from
 * two browsers is two Party connections with the same player id; presets are
 * owned by the id, so Views lists that player once.
 */
export const uniqueById = <T extends { id: string }>(items: readonly T[]): T[] => {
    const seen = new Set<string>();
    return items.filter(({ id }) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
};
