const UINT32_SIZE = 0x100000000;

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInteger(index + 1);
    const current = copy[index];
    const random = copy[randomIndex];

    if (current === undefined || random === undefined) {
      continue;
    }

    copy[index] = random;
    copy[randomIndex] = current;
  }

  return copy;
}

function randomInteger(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0;
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const limit = UINT32_SIZE - (UINT32_SIZE % maxExclusive);
    const buffer = new Uint32Array(1);

    do {
      cryptoApi.getRandomValues(buffer);
    } while ((buffer[0] ?? 0) >= limit);

    return (buffer[0] ?? 0) % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}
