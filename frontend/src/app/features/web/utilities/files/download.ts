/**
 * Saves a file the user asked for: a local link to it is clicked, then released
 */
export function downloadBlob({ file, name }: { file: Blob; name: string }): void {
   const url: string = URL.createObjectURL(file);
   const link: HTMLAnchorElement = document.createElement('a');

   link.href = url;
   link.download = name;
   link.click();

   URL.revokeObjectURL(url);
}

/**
 * Today (local time) as YYYY-MM-DD, for the name of a file
 */
export function fileDate(): string {
   return new Date().toLocaleDateString('sv-SE');
}
