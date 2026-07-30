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
// Settings — Script Properties, NOT constants in this file.
// ---------------------------------------------------------------------------
//
// This repository is public, so nothing configurable lives in the source. Set the
// values in the Apps Script project instead: Project Settings → Script Properties.
// A bot token pasted into this file would be published the moment it is committed.
//
//   NOTIFY_EMAIL       — where the "new request" mail goes.
//                        Unset → the script owner's own address.
//   TELEGRAM_BOT_TOKEN — leave unset to disable Telegram notifications entirely.
//   TELEGRAM_CHAT_ID   — target chat; required together with the token.
//   TELEGRAM_TOPIC_ID  — forum topic id; unset when the chat has no topics.

/** Read one Script Property; '' when it is not set. */
function setting_(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || '';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

var FORM_TITLE = 'Content Swiss Knife — запити на покращення';

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

/**
 * Title prefix of the screenshot question.
 *
 * The question itself has to be added by hand in the Forms UI: the Form class has
 * addTextItem, addParagraphTextItem, addListItem and the rest, but NO addFileUploadItem —
 * Apps Script can read a file-upload answer and cannot create the question. Matched on the
 * prefix because the exact wording is typed in the UI, not here.
 */
var Q_SCREENSHOT = 'Скріншот';

/** How much of the "before"/"after" fields the chat message shows. The rest is in the sheet. */
var PREVIEW_CHARS = 200;

/** sendMessage caps text at 4096 characters. */
var TELEGRAM_TEXT_LIMIT = 4096;

/** sendPhoto refuses anything above 10 MB; such a file is left as a link instead. */
var TELEGRAM_PHOTO_LIMIT_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function setUp() {
  // setUp() BUILDS A NEW FORM every time — createForm_ calls FormApp.create. Anything added by
  // hand afterwards (the file-upload question, an extra question, a changed question type) exists
  // only in the old form and is not carried over, and the new form gets new entry ids that no
  // longer match src/environments. Running it twice is therefore destructive, so the second run
  // stops here unless it is asked for explicitly.
  var existing = setting_('FORM_URL');
  if (existing && setting_('FORCE_NEW_FORM') !== 'yes') {
    Logger.log('Форму вже створено: ' + existing);
    Logger.log('');
    Logger.log('Повторний запуск створив би ЩЕ ОДНУ форму з нуля — без жодної з ваших ручних');
    Logger.log('правок і з новими entry.*, які довелося б знову переносити в конфіг.');
    Logger.log('Правте наявну форму в UI; для діагностики запустіть printFormInfo().');
    Logger.log('');
    Logger.log('Якщо форма справді потрібна нова: Script Properties → FORCE_NEW_FORM = yes.');
    return;
  }

  var form = createForm_();
  var spreadsheet = linkSpreadsheet_(form);
  var sheet = prepareSheet_(spreadsheet);
  installTrigger_(spreadsheet);

  // Remembered so printFormInfo() can reach the live form, and so a second setUp() can refuse.
  PropertiesService.getScriptProperties().setProperties({
    FORM_URL: form.getEditUrl(),
    SPREADSHEET_URL: spreadsheet.getUrl()
  });
  PropertiesService.getScriptProperties().deleteProperty('FORCE_NEW_FORM');

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
  Logger.log('=== Два кроки, яких цей скрипт зробити не може ===');
  Logger.log('1. Додайте у форму питання «Скріншот (необовʼязково)» типу File upload.');
  Logger.log('   FormApp не має addFileUploadItem — таке питання створюється лише в UI форми.');
  Logger.log('2. Запустіть testTelegram() і прийміть запит на доступ до Drive: надсилання');
  Logger.log('   скріншотів потребує скоупа, якого при першій авторизації ще не було.');
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

  // The form URL lives in a public repository, so the form itself must not accept
  // anonymous answers. On a Workspace account this restricts responses to the
  // organisation; on a personal account the call fails and the form would silently
  // stay open — hence the loud warning rather than a shrug.
  try {
    form.setRequireLogin(true);
  } catch (err) {
    Logger.log('!!! УВАГА: setRequireLogin(true) не спрацював — форма ЛИШИЛАСЬ ВІДКРИТОЮ.');
    Logger.log('!!! Це не Workspace-акаунт. Закрийте форму вручну:');
    Logger.log('!!! форма → Settings → Responses → збір підтверджених адрес. Помилка: ' + err);
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

function collectEntryIds_(form) {
  var ids = { author: '', tool: '' };

  form.getItems().forEach(function (item) {
    if (item.getTitle() === Q_AUTHOR) ids.author = entryIdFor_(form, item);
    else if (item.getTitle() === Q_TOOL) ids.tool = entryIdFor_(form, item);
  });

  if (!ids.author || !ids.tool) {
    Logger.log('УВАГА: не вдалося визначити entry ID автоматично.');
    Logger.log('Відкрийте форму → ⋮ → «Отримати заповнене посилання», заповніть два поля');
    Logger.log('і візьміть entry.* з отриманого URL вручну.');
  }
  return ids;
}

/**
 * The `entry.<id>` of one question.
 *
 * There is no getter for it, so the id is read back out of a throwaway prefilled URL — one
 * question per URL, which keeps the id-to-question mapping unambiguous.
 *
 * Dispatches on the item's ACTUAL type instead of assuming one. Switching a question from short
 * answer to paragraph in the UI is an ordinary edit, and a hard-coded asTextItem() throws on it.
 * Worth knowing: that switch also gives the question a NEW entry id, so the prefill in
 * src/environments stops filling it — silently, since Forms just ignores an unknown entry.
 */
function entryIdFor_(form, item) {
  var response;
  try {
    switch (item.getType()) {
      case FormApp.ItemType.TEXT:
        response = item.asTextItem().createResponse('placeholder');
        break;
      case FormApp.ItemType.PARAGRAPH_TEXT:
        response = item.asParagraphTextItem().createResponse('placeholder');
        break;
      case FormApp.ItemType.LIST:
        response = item.asListItem().createResponse(item.asListItem().getChoices()[0].getValue());
        break;
      case FormApp.ItemType.MULTIPLE_CHOICE:
        response = item.asMultipleChoiceItem()
          .createResponse(item.asMultipleChoiceItem().getChoices()[0].getValue());
        break;
      default:
        return ''; // file upload, scale, date… — nothing the app prefills
    }

    var url = form.createResponse().withItemResponse(response).toPrefilledUrl();
    var match = url.match(/entry\.(\d+)/);
    return match ? 'entry.' + match[1] : '';
  } catch (err) {
    Logger.log('Не вдалося прочитати entry id для «' + item.getTitle() + '»: ' + err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Spreadsheet
// ---------------------------------------------------------------------------

function linkSpreadsheet_(form) {
  var spreadsheet = SpreadsheetApp.create(FORM_TITLE + ' (відповіді)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  SpreadsheetApp.flush();
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
    if (sheets[i].getFormUrl()) return sheets[i];
  }
  return sheets[0];
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

function installTrigger_(spreadsheet) {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === HANDLER_NAME) ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger(HANDLER_NAME)
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}

/** Installed trigger — do not call directly. */
function onFeedbackSubmit(e) {
  var summary = null;
  var summaryText = '';

  try {
    summary = stampStatusAndSummarise_(e);
    summaryText = summary.text;
  } catch (err) {
    summaryText = 'Новий запит надійшов, але прочитати його не вдалося: ' + err;
  }

  // Mail carries the request in full — it is the archive copy, and MailApp has no size limit
  // worth worrying about here.
  var recipient = setting_('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
  if (recipient) {
    MailApp.sendEmail(recipient, 'CSK: Новий запит на автоматизацію', summaryText);
  }

  var chatId = setting_('TELEGRAM_CHAT_ID');
  if (!setting_('TELEGRAM_BOT_TOKEN') || !chatId) return;

  if (!summary) {
    sendTelegram_('sendMessage', { chat_id: chatId, text: summaryText });
    return;
  }

  // Chat gets a signal, not the record: the "before"/"after" fields hold HTML pasted out of
  // the editor, routinely 20 000+ characters. sendMessage caps at 4096, so the old message
  // was rejected outright — and even truncated it would have been a wall of markup.
  sendTelegram_('sendMessage', {
    chat_id: chatId,
    text: buildTelegramText_(summary.fields, summary.sheetUrl),
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  sendScreenshots_(summary.fields, fieldValue_(summary.fields, Q_TARGET) || 'Скріншот із запиту');
}

/** Write the default status into the new row, and return the answers plus the mail body. */
function stampStatusAndSummarise_(e) {
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  var linesText = [];
  var fields = [];

  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i]);
    if (!header || header === STATUS_COL_NAME || header === COMMENT_COL_NAME) continue;

    var value = String(values[i]);
    linesText.push(header + ':\n' + value + '\n');
    fields.push({ header: header, value: value });
  }

  var statusIndex = headers.indexOf(STATUS_COL_NAME);
  if (statusIndex !== -1 && !values[statusIndex]) {
    sheet.getRange(row, statusIndex + 1).setValue(STATUS_NEW);
  }

  var sheetUrl = sheet.getParent().getUrl();
  linesText.push('Таблиця: ' + sheetUrl);

  // Returns data, not formatted output: mail and chat want very different things out of it.
  return { text: linesText.join('\n'), fields: fields, sheetUrl: sheetUrl };
}

function fieldValue_(fields, header) {
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].header === header) return fields[i].value;
  }
  return '';
}

/** The compact chat message: who/where/what, a readable excerpt, and a way to the full record. */
function buildTelegramText_(fields, sheetUrl) {
  var head = ['💡 <b>Новий запит на автоматизацію</b>', ''];

  [{ header: Q_AUTHOR, label: 'Хто' },
   { header: Q_TOOL, label: 'Де' },
   { header: Q_TARGET, label: 'Що' },
   { header: Q_FREQUENCY, label: 'Частота' }].forEach(function (field) {
    var value = fieldValue_(fields, field.header);
    if (value) head.push('<b>' + field.label + ':</b> ' + escapeHtml_(value));
  });

  var previews = [];
  [{ header: Q_BEFORE, label: 'ДО' },
   { header: Q_AFTER, label: 'ПІСЛЯ' }].forEach(function (field) {
    var value = fieldValue_(fields, field.header);
    if (value) previews.push('', '<b>' + field.label + ':</b>', '<i>' + previewText_(value) + '</i>');
  });

  // Anything the form has grown since this script was written. Questions get added in the UI, and
  // a new one appearing in the sheet and the mail but not in the chat would be a silent gap.
  // Same 200-character preview, so an added paragraph question cannot blow the message up either.
  var known = [Q_AUTHOR, Q_TOOL, Q_TARGET, Q_FREQUENCY, Q_BEFORE, Q_AFTER];
  fields.forEach(function (field) {
    if (!field.value) return;
    if (known.indexOf(field.header) !== -1) return;
    if (field.header.indexOf(Q_SCREENSHOT) === 0) return; // goes as an image, not as text
    previews.push('', '<b>' + escapeHtml_(field.header) + ':</b>',
      '<i>' + previewText_(field.value) + '</i>');
  });

  var tail = ['', '<a href="' + sheetUrl + '">Відкрити таблицю 📊</a>'];

  var text = head.concat(previews, tail).join('\n');
  if (text.length <= TELEGRAM_TEXT_LIMIT) return text;

  // Unreachable with 200-character previews, but the product name is free text too. Drop the
  // previews wholesale rather than slicing: a cut through an HTML tag would trade one silent
  // failure ("message is too long") for another ("can't parse entities").
  return head.concat(tail).join('\n');
}

/**
 * A readable excerpt of a field that contains pasted HTML.
 *
 * The markup is stripped rather than shown. Telegram renders only a narrow set of tags, so the
 * alternative — escaping the source — puts `&lt;p style="margin:0 0 12px"&gt;…` in the chat,
 * which is unreadable and spends the whole character budget on attributes. The original, with
 * its formatting intact, stays in the sheet and in the mail.
 */
function previewText_(raw) {
  var text = String(raw).replace(/<[^>]+>/g, ' ');

  // Decode BEFORE collapsing, so that an &nbsp; becomes a space that the collapse can absorb.
  // The pipeline emits NBSP deliberately (NUM<NBSP>UNIT), so this is the common case, not an edge.
  text = decodeEntities_(text).replace(/\s+/g, ' ').trim();

  if (text.length <= PREVIEW_CHARS) return escapeHtml_(text);

  var clipped = text.slice(0, PREVIEW_CHARS);
  // Back off to a word boundary, but only when the cut actually landed inside a word —
  // testing the character just past the cut. Backing off unconditionally would throw away a
  // whole word whenever the budget happened to end exactly on one.
  var cutMidWord = /\S/.test(text.charAt(PREVIEW_CHARS));
  var atWord = cutMidWord ? clipped.replace(/\s+\S*$/, '') : clipped;
  // Escaping comes last, on the already-clipped text: clipping escaped text could cut through
  // an entity and hand Telegram a half-written `&am`.
  return escapeHtml_(atWord || clipped) + '…';
}

function decodeEntities_(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // last, or `&amp;lt;` would decode twice into `<`
}

function escapeHtml_(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Post the uploaded screenshots into the chat.
 *
 * The file-upload question has to be created by hand in the Forms UI — see Q_SCREENSHOT. Its
 * answer arrives in the sheet as comma-separated `.../open?id=<id>` links, so the ids are read
 * straight out of the cell and the separator never matters.
 */
function sendScreenshots_(fields, caption) {
  var cell = '';
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].header.indexOf(Q_SCREENSHOT) === 0) { cell = fields[i].value; break; }
  }
  if (!cell) return;

  var chatId = setting_('TELEGRAM_CHAT_ID');
  var ids = cell.match(/[-\w]{25,}/g) || [];

  ids.forEach(function (id) {
    try {
      var file = DriveApp.getFileById(id);

      if (file.getSize() > TELEGRAM_PHOTO_LIMIT_BYTES) {
        Logger.log('Файл завеликий для Telegram, лишається в таблиці: ' + file.getUrl());
        return;
      }

      // An image goes as a photo so it is visible in the chat; anything else (PDF, docx) as a
      // document, which sendPhoto would reject.
      var isImage = file.getMimeType().indexOf('image/') === 0;
      var payload = { chat_id: chatId, caption: caption };
      payload[isImage ? 'photo' : 'document'] = file.getBlob();

      sendTelegram_(isImage ? 'sendPhoto' : 'sendDocument', payload);
    } catch (err) {
      Logger.log('Не вдалося надіслати файл ' + id + ': ' + err);
    }
  });
}

/**
 * One Telegram call, with the failure made visible.
 *
 * `muteHttpExceptions: true` stays — a rejected message must not abort the trigger after the
 * mail has already gone out. What changes is that the response is now READ: without this a 400
 * returns normally, the catch never fires, and nothing reaches the log. Telegram names the
 * reason verbatim in the body's `description` field.
 */
function sendTelegram_(method, payload) {
  var botToken = setting_('TELEGRAM_BOT_TOKEN');
  if (!botToken) return false;

  // setting_ returns a string; message_thread_id must be an integer. Number('') is 0 and
  // Number('abc') is NaN — both falsy, so an unset or malformed property just omits the field.
  var topicId = Number(setting_('TELEGRAM_TOPIC_ID'));
  if (topicId) payload.message_thread_id = topicId;

  var hasBlob = false;
  for (var key in payload) {
    if (payload[key] && typeof payload[key].getBytes === 'function') hasBlob = true;
  }

  // A payload carrying a Blob must be multipart, and UrlFetchApp only builds that when
  // contentType is left unset. Declaring application/json here would post the JSON of a Blob.
  var options = hasBlob
    ? { method: 'post', payload: payload, muteHttpExceptions: true }
    : {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

  try {
    var response = UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/' + method, options);
    if (response.getResponseCode() === 200) return true;

    Logger.log('!!! Telegram відхилив ' + method + ' (HTTP ' + response.getResponseCode() + '): '
      + response.getContentText());
    return false;
  } catch (err) {
    Logger.log('!!! Telegram: запит ' + method + ' не вдався: ' + err);
    return false;
  }
}

/**
 * Report on the LIVE form: current entry ids, the questions as they stand now, and the column
 * order of the response sheet. Creates nothing and changes nothing — run it after editing the
 * form by hand to see whether src/environments still matches reality.
 *
 * Needs the FORM_URL script property; setUp() writes it. For a form created before that, paste
 * the form's edit URL into Script Properties → FORM_URL yourself.
 */
function printFormInfo() {
  var formUrl = setting_('FORM_URL');
  if (!formUrl) {
    Logger.log('Не задано FORM_URL у Script Properties.');
    Logger.log('Відкрийте форму в режимі редагування, скопіюйте URL з адресного рядка');
    Logger.log('і додайте властивість FORM_URL з цим значенням.');
    return;
  }

  var form;
  try {
    form = FormApp.openByUrl(formUrl);
  } catch (err) {
    Logger.log('Не вдалося відкрити форму за FORM_URL: ' + err);
    Logger.log('Потрібен URL РЕДАГУВАННЯ (…/edit), а не той, що для редакторів (…/viewform).');
    return;
  }

  // Identity first, and the id unconditionally: several forms have been created over time, and
  // a report has to say which one it is even when getTitle() comes back empty — as it did.
  Logger.log('=== Форма ===');
  Logger.log('Назва: ' + probe_(function () {
    return form.getTitle() || DriveApp.getFileById(form.getId()).getName() || '(без назви)';
  }));
  Logger.log('ID: ' + probe_(function () { return form.getId(); }));
  Logger.log('Редагування: ' + probe_(function () { return form.getEditUrl(); }));
  Logger.log('Для редакторів: ' + probe_(function () { return form.getPublishedUrl(); }));
  Logger.log('');

  // The point of the whole function — printed before anything that might fail.
  reportEntryIds_(form);
  reportSheet_(form);
  reportScreenshotQuestion_(form);
  reportQuestions_(form);
  reportLoginRequirement_(form);
}

/**
 * Runs one probe and turns any failure into a line of the report.
 *
 * A diagnostic that dies on its fourth line is useless exactly when it is needed: the first
 * version of this function aborted on requiresLogin() and took the entry ids, the questions and
 * the sheet columns down with it.
 */
function probe_(fn) {
  try {
    return fn();
  } catch (err) {
    return 'не вдалося прочитати — ' + err;
  }
}

function reportEntryIds_(form) {
  Logger.log('=== Поточні entry.* — звірте з src/environments/environment*.ts ===');
  try {
    // A mismatch means the button opens the form with that field empty: Forms ignores an
    // unknown entry rather than complaining. Changing a question's TYPE is enough to cause it.
    var ids = collectEntryIds_(form);
    Logger.log("    entryAuthor: '" + ids.author + "',   // " + Q_AUTHOR);
    Logger.log("    entryTool:   '" + ids.tool + "',   // " + Q_TOOL);
  } catch (err) {
    Logger.log('Не вдалося: ' + err);
    Logger.log('Обхід: форма → ⋮ → «Отримати заповнене посилання», заповніть два поля,');
    Logger.log('візьміть entry.* з отриманого URL.');
  }
  Logger.log('');
}

function reportSheet_(form) {
  Logger.log('=== Колонки таблиці (порядок неважливий, пошук іде за назвою) ===');
  try {
    var destinationId = form.getDestinationId();
    if (!destinationId) {
      Logger.log('До форми не привʼязана таблиця відповідей.');
      Logger.log('');
      return;
    }

    var sheet = responseSheet_(SpreadsheetApp.openById(destinationId));
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(function (header, index) {
      Logger.log('  ' + (index + 1) + '. ' + header);
    });

    [STATUS_COL_NAME, COMMENT_COL_NAME].forEach(function (name) {
      if (headers.indexOf(name) === -1) {
        Logger.log('УВАГА: колонки «' + name + '» немає — додайте її заголовком у перший рядок.');
      }
    });
  } catch (err) {
    Logger.log('Не вдалося прочитати таблицю: ' + err);
  }
  Logger.log('');
}

function reportScreenshotQuestion_(form) {
  try {
    var uploads = form.getItems().filter(function (item) {
      return item.getType() === FormApp.ItemType.FILE_UPLOAD;
    });

    if (!uploads.length) {
      Logger.log('Питання для скріншотів: НЕМАЄ — додайте вручну (тип File upload).');
      Logger.log('Скрипт цього не вміє: у класі Form немає addFileUploadItem.');
    } else if (!uploads.some(function (item) { return item.getTitle().indexOf(Q_SCREENSHOT) === 0; })) {
      Logger.log('Питання для скріншотів: є, але заголовок не починається з «' + Q_SCREENSHOT + '»');
      Logger.log('— скрипт не знайде колонку і не надішле зображення.');
    } else {
      Logger.log('Питання для скріншотів: є, заголовок правильний.');
    }
  } catch (err) {
    Logger.log('Не вдалося перевірити питання для скріншотів: ' + err);
  }
  Logger.log('');
}

function reportQuestions_(form) {
  Logger.log('=== Питання ===');
  try {
    form.getItems().forEach(function (item, index) {
      Logger.log((index + 1) + '. [' + item.getType() + '] ' + item.getTitle());
    });
  } catch (err) {
    Logger.log('Не вдалося прочитати список питань: ' + err);
  }
  Logger.log('');
}

/**
 * Whether the form is closed to outsiders — the only thing standing between a public repository
 * and anyone filling in the team's tracker. Never skipped silently.
 */
function reportLoginRequirement_(form) {
  Logger.log('=== Доступ до форми ===');
  try {
    Logger.log(form.requiresLogin()
      ? 'Вимагає входу: так — відповідати можуть лише свої.'
      : 'Вимагає входу: НІ. Форма приймає відповіді від будь-кого, а її URL лежить у '
        + 'публічному репозиторії. Увімкніть обмеження у Settings → Responses.');
  } catch (err) {
    // requiresLogin is Workspace-only, and Forms also returns "Failed to edit the form" while the
    // form is open in another tab. Either way the answer is unknown, and unknown is not "fine".
    Logger.log('Прочитати не вдалося: ' + err);
    Logger.log('ПЕРЕВІРТЕ ВРУЧНУ: форма → Settings → Responses → відповіді обмежені організацією.');
    Logger.log('Це не дрібниця: setRequireLogin(true) при створенні форми міг впасти так само,');
    Logger.log('і тоді форма лишилась відкритою, а її URL — у публічному репозиторії.');
  }
}

/**
 * Run this from the editor to check the Telegram setup without submitting the form.
 * Verdict goes to View → Execution log.
 */
function testTelegram() {
  var missing = [];
  if (!setting_('TELEGRAM_BOT_TOKEN')) missing.push('TELEGRAM_BOT_TOKEN');
  var chatId = setting_('TELEGRAM_CHAT_ID');
  if (!chatId) missing.push('TELEGRAM_CHAT_ID');

  if (missing.length) {
    Logger.log('Не задано у Script Properties: ' + missing.join(', '));
    Logger.log('Project Settings → Script Properties → Add script property.');
    return;
  }

  var ok = sendTelegram_('sendMessage', {
    chat_id: chatId,
    text: '✅ <b>Content Swiss Knife</b>\nПеревірка звʼязку — сповіщення налаштовані правильно.',
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  Logger.log(ok
    ? 'Надіслано. Якщо в чаті порожньо — TELEGRAM_CHAT_ID вказує не на той чат.'
    : 'Не надіслано. Причина — у рядку вище, поле "description" у відповіді Telegram.');
}