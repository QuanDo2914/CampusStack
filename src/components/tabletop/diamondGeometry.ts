export function diamondFacePath(index: number, edge: string): string {
  if (index % 10 === 0) return 'M50 2 98 50 50 98 2 50Z';
  return ({top:'M50 2 98 50 25 148 -23 100Z',right:'M98 50 50 98 -23 0 25 -48Z',bottom:'M2 50 50 98 123 0 75 -48Z',left:'M2 50 50 2 123 100 75 148Z'} as Record<string,string>)[edge];
}
