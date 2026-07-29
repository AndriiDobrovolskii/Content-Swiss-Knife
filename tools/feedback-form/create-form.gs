/**
 * Content Swiss Knife — improvement-request tracker bootstrap.
 *
 * Run this ONCE on script.google.com to create the whole thing:
 *   the Google Form, the linked response spreadsheet with Status / Developer-comment
 *   columns, and the on-submit notification.
 *
 * It is not part of the Angular build — it is a paste-and-run artifact.
 * Setup steps live in tools/feedback-form/README.md.
 *
 * After the run, check the execution log: it prints the form URL and the two
 * `entry.*` IDs that go into src/environments/environment*.ts.
 */

// ---------------------------------------------------------------------------
// Settings — edit these two lines, then run setUp().
// ---------------------------------------------------------------------------

/** Where the "new request" notification goes. Leave empty to use the script owner's address. */
var NOTIFY_EMAIL = '';

/**
 * Optional Telegram / Slack / Discord incoming-webhook URL.
 * Empty string = messenger notifications off, email only.
 */
var WEBHOOK_URL = '';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var FORM_TITLE = 'Content Swiss Knife — запити на автоматизацію';

var Q_AUTHOR = 'Хто подає запит?';
var Q_TOOL = 'Де це трапилось?';
var Q_TARGET = 'Що саме ви редагуєте?';
var Q_BEFORE = 'ДО — що ви отримуєте зараз';
var Q_AFTER = 'ПІСЛЯ — що має вийти';
var Q_FREQUENCY = 'Наскільки часто це трапляється?';

/** Keep in sync with TOOL_LABEL in src/app/app.component.ts. */
var TOOLS = [
  'Generator',
  'UA Description',
  'Optimizer',
  'Translator',
  'Image Tools',
  'SEO Meta',
  'Copywriter',
  'Readability',
  'Slug Generator',
  'HTML-редактор',
  'Dashboard',
  'Інше',
];

var FREQUENCIES = ['У кожному продукті', 'Кілька разів на день', 'Зрідка'];

var STATUS_COL_NAME = 'Статус';
var COMMENT_COL_NAME = 'Коментар розробника';
var STATUS_NEW = 'Нове';
var STATUSES = [STATUS_NEW, 'В роботі', 'Заплановано', 'Зроблено', 'Не робимо'];
var STATUS_COLORS = {
  'Нове': '#fff2cc',
  'В роботі': '#cfe2f3',
  'Заплановано': '#e6d0f5',
  'Зроблено': '#d9ead3',
  'Не робимо': '#f4cccc',
};

var HANDLER_NAME = 'onFeedbackSubmit';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function setUp() {
  var form = createForm_();
  var spreadsheet = linkSpreadsheet_(form);
  var sheet = prepareSheet_(spreadsheet);
  installTrigger_(spreadsheet);

  var entries = collectEntryIds_(form);

  Logger.log('');
  Logger.log('=== Готово. Скопіюйте це у src/environments/environment.ts ===');
  Logger.log('');
  Logger.log('  feedbackForm: {');
  Logger.log("    baseUrl: '" + form.getPublishedUrl() + "',");
  Logger.log("    entryAuthor: '" + entries.author + "',");
  Logger.log("    entryTool: '" + entries.tool + "',");
  Logger.log('  },');
  Logger.log('');
  Logger.log('=== Посилання ===');
  Logger.log('Форма (редагування): ' + form.getEditUrl());
  Logger.log('Форма (для редакторів): ' + form.getPublishedUrl());
  Logger.log('Таблиця зі статусами: ' + spreadsheet.getUrl());
  Logger.log('Лист відповідей: ' + sheet.getName());
  Logger.log('');
  Logger.log('Далі: дайте команді доступ на ПЕРЕГЛЯД до таблиці — саме прозорий статус');
  Logger.log('тримає форму живою. Текст анонсу — у tools/feedback-form/README.md.');
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function createForm_() {
  var form = FormApp.create(FORM_TITLE);

  form.setDescription(
    'Робите щось рутинне руками? Опишіть це тут — заповнення займає до хвилини.\n' +
    'Найважливіші поля — «ДО» і «ПІСЛЯ»: без конкретного прикладу автоматизувати неможливо.\n' +
    'Статус свого запиту ви завжди бачите у спільній таблиці.'
  );
  form.setConfirmationMessage('Дякуємо! Запит уже в таблиці — статус можна відстежувати там.');
  form.setShowLinkToRespondAgain(true);
  form.setAllowResponseEdits(true);
  form.setProgressBar(false);

  // Domain-restricted by default on Workspace accounts; harmless/absent on personal ones.
  try {
    form.setRequireLogin(false);
  } catch (err) {
    Logger.log('setRequireLogin недоступний для цього акаунта — це нормально: ' + err);
  }

  // Free text, not a dropdown: the app prefills it from localStorage, so a new
  // teammate never has to be added to a list in two codebases.
  form.addTextItem()
    .setTitle(Q_AUTHOR)
    .setHelpText('Підставляється автоматично, якщо ви прийшли з кнопки в застосунку.')
    .setRequired(true);

  form.addListItem()
    .setTitle(Q_TOOL)
    .setChoiceValues(TOOLS)
    .setRequired(true);

  form.addTextItem()
    .setTitle(Q_TARGET)
    .setHelpText('Назва продукту, посилання або ID сторінки.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle(Q_BEFORE)
    .setHelpText('Вставте реальний фрагмент — те, що доводиться правити руками.')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle(Q_AFTER)
    .setHelpText('Той самий фрагмент, але яким він має бути.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle(Q_FREQUENCY)
    .setChoiceValues(FREQUENCIES)
    .setRequired(true);

  return form;
}

/**
 * There is no documented getter for a question's `entry.<id>`. The reliable way is to
 * build a throwaway prefilled URL for one question at a time and read the id back out —
 * one question per URL keeps the id-to-question mapping unambiguous.
 */
function collectEntryIds_(form) {
  var ids = { author: '', tool: '' };

  form.getItems().forEach(function (item) {
    if (item.getTitle() === Q_AUTHOR) {
      ids.author = entryIdFor_(form, item.asTextItem().createResponse('placeholder'));
    } else if (item.getTitle() === Q_TOOL) {
      ids.tool = entryIdFor_(form, item.asListItem().createResponse(TOOLS[0]));
    }
  });

  if (!ids.author || !ids.tool) {
    Logger.log('УВАГА: не вдалося визначити entry ID автоматично.');
    Logger.log('Відкрийте форму → ⋮ → «Отримати заповнене посилання», заповніть два поля');
    Logger.log('і візьміть entry.* з отриманого URL вручну.');
  }
  return ids;
}

function entryIdFor_(form, itemResponse) {
  var url = form.createResponse().withItemResponse(itemResponse).toPrefilledUrl();
  var match = url.match(/entry\.(\d+)/);
  return match ? 'entry.' + match[1] : '';
}

// ---------------------------------------------------------------------------
// Spreadsheet
// ---------------------------------------------------------------------------

function linkSpreadsheet_(form) {
  var spreadsheet = SpreadsheetApp.create(FORM_TITLE + ' (відповіді)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  SpreadsheetApp.flush();
  // Re-open: the response sheet is created after setDestination, so the handle we
  // already have does not know about it yet.
  return SpreadsheetApp.openById(spreadsheet.getId());
}

function prepareSheet_(spreadsheet) {
  var sheet = responseSheet_(spreadsheet);

  var statusCol = sheet.getLastColumn() + 1;
  var commentCol = statusCol + 1;
  sheet.getRange(1, statusCol).setValue(STATUS_COL_NAME);
  sheet.getRange(1, commentCol).setValue(COMMENT_COL_NAME);
  sheet.getRange(1, 1, 1, commentCol).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(statusCol, 120);
  sheet.setColumnWidth(commentCol, 320);

  var statusRange = sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUSES, true)
      .setAllowInvalid(false)
      .build()
  );

  var rules = sheet.getConditionalFormatRules();
  STATUSES.forEach(function (status) {
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(status)
        .setBackground(STATUS_COLORS[status])
        .setRanges([statusRange])
        .build()
    );
  });
  sheet.setConditionalFormatRules(rules);

  return sheet;
}

function responseSheet_(spreadsheet) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    // The name is localised ("Form Responses 1" / "Відповіді форми (1)"), so match on
    // the form-link property instead of the title where possible.
    if (sheets[i].getFormUrl()) return sheets[i];
  }
  return sheets[0];
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

function installTrigger_(spreadsheet) {
  // Re-running setUp() must not stack duplicate notifications.
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === HANDLER_NAME) ScriptApp.deleteTrigger(trigger);
  });

  // Bound to the spreadsheet rather than the form: this gives the handler the new
  // row (e.range) as well as the answers, so it can stamp the default status.
  ScriptApp.newTrigger(HANDLER_NAME)
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}

/** Installed trigger — do not call directly. */
function onFeedbackSubmit(e) {
  var summary = '';
  try {
    summary = stampStatusAndSummarise_(e);
  } catch (err) {
    summary = 'Новий запит надійшов, але прочитати його не вдалося: ' + err;
  }

  var recipient = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (recipient) {
    MailApp.sendEmail(recipient, 'Новий запит на автоматизацію', summary);
  }

  if (WEBHOOK_URL) {
    try {
      UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ text: summary, content: summary }),
        muteHttpExceptions: true, // a broken webhook must not kill the email
      });
    } catch (err) {
      Logger.log('Вебхук не спрацював: ' + err);
    }
  }
}

/** Write the default status into the new row and build the notification text. */
function stampStatusAndSummarise_(e) {
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  var lines = [];
  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i]);
    if (!header || header === STATUS_COL_NAME || header === COMMENT_COL_NAME) continue;
    lines.push(header + ':\n' + values[i] + '\n');
  }

  var statusIndex = headers.indexOf(STATUS_COL_NAME);
  if (statusIndex !== -1 && !values[statusIndex]) {
    sheet.getRange(row, statusIndex + 1).setValue(STATUS_NEW);
  }

  lines.push('Таблиця: ' + sheet.getParent().getUrl());
  return lines.join('\n');
}
