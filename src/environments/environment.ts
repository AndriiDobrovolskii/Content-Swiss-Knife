/**
 * Development environment.
 *
 * Swapped for `environment.prod.ts` by the `fileReplacements` entry in
 * angular.json → build.configurations.production. `ng serve` (development)
 * keeps this file, so it can point at a throwaway test form.
 *
 * Nothing secret belongs here — both files are committed. API keys stay
 * server-side behind the proxy (see CLAUDE.md, architecture rule #4).
 */
export const environment = {
  production: false,

  /**
   * Editors' improvement-request Google Form.
   * Fill these in with the values printed by `tools/feedback-form/create-form.gs`.
   * While `baseUrl` is empty the in-app buttons stay hidden.
   */
  feedbackForm: {
    /** Published `/viewform` URL of the form. */
    baseUrl: '',
    /** `entry.<id>` of the "Хто подає запит?" question. */
    entryAuthor: '',
    /** `entry.<id>` of the "Де це трапилось?" question. */
    entryTool: '',
  },
};
