export function deltaToPlainText(delta: any): string {
  return (
    delta?.ops
      ?.filter((op: any) => typeof op.insert === 'string')
      ?.map((op: any) => op.insert)
      ?.join('') ?? ''
  );
}
