/**
 * Production environment — used by `npm run build` via the `fileReplacements`
 * entry in angular.json → build.configurations.production.
 *
 * Keep the shape identical to environment.ts; only the values differ.
 */
export const environment = {
  production: true,

  /**
   * Editors' improvement-request Google Form — the live one the team uses.
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
