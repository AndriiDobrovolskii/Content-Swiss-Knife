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
    baseUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScZ0AS_5cIrxGcp5eC2ZUUQNCTWGgk3MuHaHkNdEM13r_x48Q/viewform',
    /** `entry.<id>` of the "Хто подає запит?" question. */
    entryAuthor: 'entry.1020137590',
    /** `entry.<id>` of the "Де це трапилось?" question. */
    entryTool: 'entry.422894223',

    // Auto-filled app-state snapshot — see tools/feedback-form/README.md. Empty until the
    // eleven questions are added to the live form and printFormInfo() confirms their ids.
    /** `entry.<id>` of the "Сайт" question. */
    entrySite: '',
    /** `entry.<id>` of the "Шаблон" question. */
    entryTemplate: '',
    /** `entry.<id>` of the "Назва продукту (снепшот)" question. */
    entryProductName: '',
    /** `entry.<id>` of the "Вхідний текст (снепшот)" question. */
    entryInputText: '',
    /** `entry.<id>` of the "Специфікації (снепшот)" question. */
    entrySpecs: '',
    /** `entry.<id>` of the "Додатковий контент (снепшот)" question. */
    entrySupplementalContent: '',
    /** `entry.<id>` of the "Кастомні інструкції (снепшот)" question. */
    entryCustomInstructions: '',
    /** `entry.<id>` of the "LLM Deep" question. */
    entryLlmDeep: '',
    /** `entry.<id>` of the "LLM Fast" question. */
    entryLlmFast: '',
    /** `entry.<id>` of the "Deep thinking увімкнено" question. */
    entryThinkingEnabled: '',
    /** `entry.<id>` of the "Сесія" question. */
    entrySessionId: '',
  },
};
