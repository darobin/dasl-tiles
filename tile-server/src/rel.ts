
// call with makeRel(import.meta.url), returns a function that resolves relative paths
export default function makeRel (importURL: string): (pth: string) => string {
  return (pth: string) => new URL(pth, importURL).toString().replace(/^file:\/\//, '');
}
