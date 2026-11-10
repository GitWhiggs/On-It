export function redirectSystemPath({
    path,
  }: {
    path: string;
    initial: boolean;
  }): string | null {
    if (path.includes('firebaseauth/link')) {
      return null;
    }
  
    return path;
  }