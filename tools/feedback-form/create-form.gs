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
  var summaryText = '';
  var summaryHtml = '';
  
  try {
    var summaries = stampStatusAndSummarise_(e);
    summaryText = summaries.text;
    summaryHtml = summaries.html;
  } catch (err) {
    summaryText = 'Новий запит надійшов, але прочитати його не вдалося: ' + err;
    summaryHtml = summaryText;
  }

  // Відправка на Email (звичайним текстом)
  var recipient = setting_('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
  if (recipient) {
    MailApp.sendEmail(recipient, 'CSK: Новий запит на автоматизацію', summaryText);
  }

  // Відправка в Telegram (HTML)
  var botToken = setting_('TELEGRAM_BOT_TOKEN');
  var chatId = setting_('TELEGRAM_CHAT_ID');
  var topicId = setting_('TELEGRAM_TOPIC_ID');

  if (botToken && chatId) {
    try {
      var payload = {
        chat_id: chatId,
        text: '💡 <b>Новий запит на автоматизацію</b>\n\n' + summaryHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      };

      if (topicId) {
        payload.message_thread_id = topicId;
      }

      UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log('Telegram сповіщення не спрацювало: ' + err);
    }
  }
}

/** Write the default status into the new row and build the notification text. */
function stampStatusAndSummarise_(e) {
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  var linesText = [];
  var linesHtml = [];
  
  for (var i = 0; i < headers.length; i++) {
    var header = String(headers[i]);
    if (!header || header === STATUS_COL_NAME || header === COMMENT_COL_NAME) continue;
    
    var val = String(values[i]);
    
    // Для Email
    linesText.push(header + ':\n' + val + '\n');
    
    // Для Telegram: екрануємо HTML-теги користувача, щоб не зламати parse_mode: 'HTML'
    var safeVal = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var safeHeader = header.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Загортаємо в <code> блок, якщо це питання ДО або ПІСЛЯ, для краси
    if (header === Q_BEFORE || header === Q_AFTER) {
       safeVal = '<code>' + safeVal + '</code>';
    }
    
    linesHtml.push('<b>' + safeHeader + ':</b>\n' + safeVal + '\n');
  }

  var statusIndex = headers.indexOf(STATUS_COL_NAME);
  if (statusIndex !== -1 && !values[statusIndex]) {
    sheet.getRange(row, statusIndex + 1).setValue(STATUS_NEW);
  }

  var sheetUrl = sheet.getParent().getUrl();
  
  linesText.push('Таблиця: ' + sheetUrl);
  linesHtml.push('<a href="' + sheetUrl + '">Відкрити таблицю 📊</a>');
  
  return {
    text: linesText.join('\n'),
    html: linesHtml.join('\n')
  };
}