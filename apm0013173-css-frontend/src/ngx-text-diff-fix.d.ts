// Patch for ngx-text-diff type error with diff_match_patch
// Place this file in src/ and ensure tsconfig.app.json includes it

import { diff_match_patch } from 'diff-match-patch';
declare module 'ngx-text-diff/lib/ngx-text-diff.service' {
  export interface NgxTextDiffService {
    diffParser: typeof diff_match_patch;
    // Add other members as needed
  }
}
