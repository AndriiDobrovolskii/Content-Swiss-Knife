# Spec: зміни в промптах — прибрати вказівки на зображення та оживити ToV

| | |
|---|---|
| Статус | Рекомендації. Жодного файлу в `src` не змінено |
| Приклад продукту | Creality Pika (EXPERT3D, uk-UA) |
| Дата | 2026-10-17 |
| Охоплення | `prompt-core/*`, `prompts/*`, `utils/*` (детектор і повідомлення repair-циклу) |

---

## 1. Проблеми

**P1. Опис вказує на картинки.** У тексті Creality Pika було 35 влучань: «показано на зображенні», «видно на», «нижче», «Колаж показує…», «На фото…». Вони стояли в абзацах над фігурами (усі 19) і в 16 із 19 підписів (8 із «На фото/зображенні…», 7 з «Колаж/Схема показує…», 1 з «Рекламний банер, на якому…»).

**P2. Опис сухий.** Факти перелічені без наслідку для читача. Виміряно: 81 речення, середня довжина 12,2 слова, «тож» використано 7 разів, хук описує фото («На столі лежить пошкоджена деталь…»), п'ять пунктів «Застосування» збудовані за одним шаблоном.

**Обмеження.** `EXPERT3D_TOV_BASE_OVERLAY` вимагає «emotionally neutral, no excitement», забороняє хвалебні слова й вимагає схему «Fact → Mechanism → User consequence». Оживлення має йти через структуру, ритм і контраст, а не через емоції. `STRICT INPUT SCOPE` забороняє додавати факти поза входом.

---

## 2. Джерела проблеми P1 (6 незалежних)

| # | Файл | Місце | Що робить |
|---|---|---|---|
| S1 | `prompt-core/master-system-prompt.ts` | `[IMAGE HANDLING]` → PLACEMENT / LEAD-IN, GROUNDING LOCK, `[VIDEO]` | Вимагає лід-ін, що «integrates the image»; дає приклад «shown here» |
| S2 | `prompts/task-a-doc.ts` | FIGURE PLACEMENT | «paragraph Block that introduces what the image shows» |
| S3 | `prompts/vision-prepass.ts` | поле `description` | «says what the image shows»: звідси «На фото…» в `figcaption` |
| S4 | `prompts/task-a.ts` | `buildMarkerBlock` | Маркер ставиться «at the end of the sentence that introduces what the image shows» |
| S5 | `utils/video-manifest.ts` | `LEAD_IN_TEMPLATES` | Шаблони містять «нижче / below / ниже / poniżej / unten / abaixo / siguiente» |
| S6 | `utils/output-validator.ts` | повідомлення `image-manifest-missing` | Повертає вимогу «substantive lead-in `<p>`» у repair-циклі |

Допоміжні: `task-a.ts` (рядок про `</ul>` і `buildVideoBlock`), `prompt-core/constants.ts` (C3D OVERRIDE #5), `utils/video-manifest.ts` (повідомлення `video-embed-missing`), `services/content-orchestrator.service.ts` (текст попередження про відео).

**Як збирається підпис.** `utils/image-placeholder.ts → buildFigureParts`: `captionText = <b>{visionLabelUk}:</b> {visionDescriptionUk}`. Тобто текст `description` із Vision-проходу потрапляє в `figcaption` без редагування моделлю.

---

## 3. Вимоги до змін (прибрати вказівки на картинку)

### FR-1. Vision-проміт (`prompts/vision-prepass.ts`)

Замінити рядки про `description` та `alt` у блоці UKRAINIAN FIELDS:

```
- description: one sentence stating the product capability, part or result this image
  demonstrates, written about the PRODUCT, never about the picture. It never begins with and
  never contains «На зображенні», «На фото», «На знімку», «На кадрі», «Зображено», «Показано»,
  «Видно». It never names the medium (банер, колаж, схема, інфографіка, скриншот, кадр) and
  never makes it the subject of a verb («Колаж показує…», «Схема демонструє…»).
  Describe the content directly.
  GOOD: «Сенсорний екран запускає сканування й показує 3D-модель.»
  BAD:  «На фото сканер має вбудований екран, що показує зручність перегляду.»
- alt: one sentence for a screen-reader user. It must be different from description, not a copy.
  Start with the subject noun, never with «Зображення», «Фото» or «Знімок». Write every word in
  one alphabet: no Latin letters inside Ukrainian words.
```

Не прибирати фрази, які перевіряє `vision-prepass.spec.ts`: `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT`.

### FR-2. Майстер-промпт (`prompt-core/master-system-prompt.ts`)

**a)** Додати в `constants.ts` константу `NO_IMAGE_DEIXIS_RULE` (текст нижче) та інтерполювати її після `${PRODUCT_NAME_LOCALIZATION}` (поза `[IMAGE HANDLING]`, бо `master-system-prompt.image-markers.spec.ts` забороняє `${}` усередині цього блоку).

```
[NO PICTURE REFERENCES — body, figcaption and alt, all languages]
No sentence in the body, in a figcaption or in an alt text refers to the picture or to the page
layout. Never write "on the image/photo/frame/diagram", "below/above" as a pointer, "as shown/seen",
"pictured", or their equivalents in the output language (uk: «на зображенні», «на фото», «на знімку»,
«на кадрі», «нижче», «вище», «як видно», «показано», «зображено», «видно на»). Never make the
picture, collage, banner, scheme or infographic the subject of a verb («колаж показує», «схема
демонструє»). State the product fact directly; the figure's position and its figcaption carry the
link to the image. A sentence whose only job is to point at the picture is deleted, not reworded.
```

**b)** `[IMAGE HANDLING]` → PLACEMENT: замінити пункт `- LEAD-IN: precede every <figure> …` на:

```
- PRECEDING PARAGRAPH: precede every <figure> with a <p> of ordinary body text from the same
  sub-section. It states a product fact (a spec, a mechanism, a benefit) and reads as if the image
  did not exist; the figure follows the paragraph that discusses its subject, and the figcaption
  carries the link to the picture. Stay within the IMAGE GROUNDING LOCK.
- That paragraph refers to the product, never to the picture: it contains no pointer to the image or
  the page layout (see [NO PICTURE REFERENCES]). A sentence whose only job is to point at the picture
  is deleted, not reworded.
- Give the paragraph and the figcaption separate jobs: the paragraph is narrative context in the flow,
  the figcaption is a short label — write them with different sentences and phrasing.
```

**c)** IMAGE GROUNDING LOCK: додати перший пункт і замінити приклад.

```
- The lock restricts claims ABOUT THE IMAGE (what it proves, compares, demonstrates). It does not
  restrict product facts: the paragraph above a figure MAY and SHOULD state any fact from
  [Technical Specs] / [Raw Description] that belongs to the figure's subject, written as ordinary
  prose that never mentions the picture.
```
Замість `the lead-in may reference the image only descriptively ("the head assembly shown here…")` →
`the paragraph may name the depicted object only as a plain product fact ("The unit has three round modules on its back.")`.

Причина: без пункту про факти lock штовхає модель переказувати вміст картинки, і виходить «Ряд модулів ззаду показано на зображенні».

**d)** `[VIDEO]`: `Introduce every embed with a lead-in <p>` → `Place every embed directly after a body paragraph of its sub-section; that paragraph states a product fact and never points at the video ("below", «нижче»).`

### FR-3. `prompts/task-a-doc.ts` (FIGURE PLACEMENT)

```
FIGURE PLACEMENT — no orphan images: every figure Block is immediately preceded by a paragraph
Block of the same subsection that states a product fact from the source and never refers to the
picture itself (no «на зображенні», «нижче», «показано», «колаж показує»). A figure moved out of §2
carries that obligation with it, so place that paragraph beside it in its new section rather than
leaving it behind. The same holds for every figure's "caption" and "alt".
```
Фразу «no orphan images» лишити: її перевіряє `task-a-doc.v4.spec.ts`.

### FR-4. `prompts/task-a.ts`

| Місце | Було | Стало |
|---|---|---|
| `TASK_A_INSTRUCTION` | `: an image still needs its own lead-in <p>.` | `: a figure needs a body <p> directly above it, and that <p> never refers to the picture.` |
| `buildVideoBlock` | `Introduce each with its own lead-in <p> … The lead-in must not restate the figcaption.` | `Place each directly after a body paragraph of its §3 sub-section (a product fact in the body language, never a pointer to the video: no «нижче» / "below") … That paragraph must not restate the figcaption.` |
| `buildMarkerBlock` | `at the end of the sentence that introduces what the image shows;` | `at the end of the paragraph that states the product fact the image belongs to (the paragraph never mentions the picture);` |

Зберегти фразу «`<figure>` directly after a `</ul>`» (її перевіряє `task-a.spec.ts`).

### FR-5. `utils/video-manifest.ts`

Шаблони `LEAD_IN_TEMPLATES` без вказівок:

```ts
en: p => `See how ${p} works in practice.`,
uk: p => `Як ${p} працює на практиці.`,
ru: p => `Как ${p} работает на практике.`,
pl: p => `Zobacz, jak ${p} działa w praktyce.`,
de: p => `So arbeitet ${p} in der Praxis.`,
es: p => `Así funciona ${p} en la práctica.`,
pt: p => `Veja como ${p} funciona na prática.`,
```
Повідомлення `video-embed-missing`: `introduced by its own lead-in <p>` → `placed after a body paragraph of its sub-section (no pointer to the video)`.

### FR-6. `utils/output-validator.ts`

У повідомленні `image-manifest-missing`: `a substantive lead-in <p> directly above it` → `a body <p> directly above it (a product fact that does not point at the picture)`.

### FR-7. `prompt-core/constants.ts`, C3D OVERRIDE #5

`The lead-in must still differ from the alt text and from the preceding lead-in <p>` → `The opener must still differ from the alt text and from the paragraph above the figure`.

### FR-8. Малі правки

`services/content-orchestrator.service.ts`, два місця: `sensible lead-in paragraph` → `sensible preceding paragraph`.

### FR-9. Детермінований гейт

Новий модуль `utils/image-deixis.ts` без імпортів (щоб уникнути циклів). Перевіряти лише три носії: абзац **безпосередньо над** `<figure>`, `<figcaption>`, `alt`. Не перевіряти весь текст («нижче -10 °C» у специфікаціях — факт).

```ts
export const IMAGE_DEIXIS_PATTERNS: Readonly<Record<string, RegExp>> = {
  uk: /на\s+(?:\p{L}+\s+)?(?:зображенн|фото|знімк|кадр|ілюстраці|схем|малюнк)|(?<!\p{L})(?:нижче|вище)(?!\p{L})|як\s+(?:видно|показано)|показано|зображено|видно\s+на|(?:колаж|схем|інфографік|банер|скріншот|кадр)\p{L}*(?:\s+\p{L}+){0,4}\s+(?:показу|демонстру|ілюстру|поєдну)/iu,
  // ru та en за тим самим принципом
};
export function findImageDeixis(text: string, locale = 'uk-UA'): string | null { /* match або null */ }
export function collectFigureDeixis(html: string, locale?: string): FigureDeixisHit[] { /* 3 носії */ }
```

Підключення:
- `validateGeneratedHtml` у `output-validator.ts`: правило `image-deixis`, рівень **warning**.
- `figureCaptionWarnings` у `utils/image-placeholder.ts`: правило `image-caption-deixis`, warning.
- Після кількох прогонів на реальних товарах підвищити до `error` (repair-цикл тоді перегенеровує абзац).

Перевірка на реальних даних: на фікстурі `utils/__fixtures__/description_uk-UA.corrected.html` детектор знаходить 5 влучань; хибних спрацювань на нейтральних реченнях немає.

---

## 4. Вимоги до змін (оживити текст)

Усі правила нижче лише додаються до `EXPERT3D_TOV_BASE_OVERLAY` і не суперечать «emotionally neutral».

### FR-10. SCENE RULE

```
SCENE RULE: open each §3 <h2> section with one short sentence naming the task or constraint the
reader faces, then continue Fact -> Mechanism -> Consequence. A consequence changes what the buyer
does ("the object does not travel to the scanner; the scanner travels to the object"), not just
what the product is. No emotional adjectives.
```

### FR-11. RHYTHM RULE

```
RHYTHM: vary sentence length. In every section at most two consecutive sentences may fall in the
9–17-word band, and each section contains at least one sentence of 6 words or fewer. Do not
connect sentences with the same causal particle more than twice per document ("тож", "тому").
```
Перевірка (метрика): стандартне відхилення довжини речень ≥ 6; не менше одного речення ≤ 6 слів на секцію.

### FR-12. HONEST LIMITS

```
HONEST LIMITS: surface the non-obvious constraint in the paragraph where it matters, as a
consultant's note, not as a footnote (e.g. a mode that works only with a cable, a missing export
format, what is not in the box). Only constraints stated in the source.
```

### FR-13. HOOK

До §1 додати: `The hook names the task the buyer solves (what is scanned/printed/repaired), never describes a photo or a scene. Numbers destined for §2 are not repeated.` Хук у Creality Pika було 48 слів, вимога 40–85.

### FR-14. APPLICATIONS

До §4 додати: `Each bullet differs in structure and states the mechanism that makes THIS product the right tool: a different measurable fact in each (accuracy, time, mode, format), never the same "X: scan does Y; Z does W" frame five times.`

### FR-15. HEADINGS

Дозволити функціональні заголовки з обмеженням: до 8 слів, без назви товару в `<h3>`, не більше двох `<h2>` з `[Product-short]`. Приклади (перевірені на Creality Pika): «Сканер їде до об'єкта», «Лазер без маркерів: лише з кабелем», «Режим підключення — вибір місця роботи».

### FR-16. Якість входу (не промпт)

Опис не може бути яскравішим за `[Raw Description]`. Додати у форму вводу поля: реальні сценарії використання, результати тестів, порівняння з попереднім поколінням, обмеження. Без цього модель переписує одні й ті самі факти.

---

## 5. Тести

**Оновити (старі перевірки лишаються зеленими лише за збереження зазначених фраз):**

| Тест | Умова |
|---|---|
| `prompts/task-a.spec.ts` | Фраза «`<figure>` directly after a `</ul>`» |
| `prompts/task-a-doc.v4.spec.ts` | Фраза «no orphan images» |
| `prompts/vision-prepass.spec.ts` | `one sentence`, `differ`, `NUMBERS ARE THE HIGHEST-RISK ELEMENT` |
| `prompt-core/master-system-prompt.image-markers.spec.ts` | Старі рядки `[IMAGE HANDLING]` до `FIGURE FORMAT` не змінювати; без `${}` усередині блоку |
| `prompt-core/constants.spec.ts` | `IMAGE GROUNDING LOCK stands` |

**Додати:**
- `utils/image-deixis.spec.ts`: позитиви («Ряд із трьох круглих модулів ззаду показано на зображенні», «Три кадри показують…», «Нижче розміщено відео…»), негативи («Режим працює від -10 °C», «Сенсорний екран запускає сканування й показує 3D-модель»), невідома мова повертає `null`, `collectFigureDeixis` ловить абзац над фігурою й підпис, але не сусідній абзац.
- `prompt-core/master-system-prompt.no-deixis.spec.ts`: є `[NO PICTURE REFERENCES`; немає `SUBSTANTIVE NARRATIVE SENTENCE`, `shown here`, `The image below shows`; лишається «every `<figure>` … has a narrative `<p>` directly above it».
- `prompts/vision-prepass.spec.ts`: промпт містить `«На зображенні»`, `never begins with and never contains`, `never makes it the subject of a verb`.
- `utils/video-manifest.spec.ts`: жоден шаблон `LEAD_IN_TEMPLATES` не містить «нижче / below / ниже / poniżej / unten / abaixo / siguiente».
- `utils/output-validator.spec.ts`: правило `image-deixis` дає `warning` на абзаці над фігурою та не спрацьовує на «нижче -10 °C» поза фігурою.

---

## 6. Порядок впровадження

1. FR-1 (Vision) — найбільший ефект на підписи.
2. FR-2…FR-4 — майстер, Doc, `task-a.ts`.
3. FR-5, FR-6, FR-7, FR-8 — шаблони й повідомлення.
4. FR-9 — гейт на рівні warning.
5. FR-10…FR-15 — правила живості в `EXPERT3D_TOV_BASE_OVERLAY` (при бажанні й в інших ToV-блоках).
6. Тести (розділ 5).
7. **Повторний Vision-прохід** для зображень, проаналізованих раніше: збережені `visionDescriptionUk` старих товарів лишаються зі старими фразами.

**Ризики.**
- Майстер-промпт змінює байтовий склад кешованого блоку: кеш один раз «охолоне» для всіх магазинів.
- Якщо `validateGeneratedHtml` викликається в тестах із фікстурами, що містять дейктики, з'являться warning-и. Тести з `toEqual([])` на таких фікстурах почервоніють.
- `master-system-prompt.image-markers.spec.ts` пінує старі рядки `[IMAGE HANDLING]`. Перевірте перед злиттям.
- Правила живості не перевірити тестом на промпті: їх перевіряє лише живий прогін.

---

## 7. Критерії приймання (на прикладі Creality Pika)

| Критерій | Було | Ціль |
|---|---|---|
| Дейктики в абзацах над фігурами, підписах і `alt` | 35 | 0 |
| Фігури без абзацу над ними / дві фігури підряд | 0 / 0 | 0 / 0 |
| Числа в тексті, яких немає у вході | не перевірялось | 0 |
| «тож» + «Тому» у документі | 7 | ≤ 2 |
| Речення ≤ 6 слів | 16 у сумі, розподіл нерівний | ≥ 1 на кожну секцію §3 |
| Середня довжина речення / σ | 12,2 / 5,7 | ≥ 12 / ≥ 6 |
| Хук починається з задачі покупця, а не з опису фото | ні | так |
| Нових фактів, яких немає у вході | — | 0 |

Для Creality Pika еталонний результат: `creality-pika-uk-v2.html` (74 речення, середня 14,2 слова, σ 6,5, 12 речень ≤ 6 слів, «тож» 1, «Тому» 1, дейктиків 0, усі числа зі джерела).

---

## 8. Приклади «було → стало»

| Місце | Було | Стало |
|---|---|---|
| Хук | «…На столі лежить пошкоджена деталь інструмента, а корпус у форм-факторі смартфона вміщується в долоню.» | «…яким оцифровують зношену деталь інструмента, фігурку чи портрет. Лазерний режим відтворює дрібні контури, а структуроване світло бере великі об'єкти навіть просто неба.» |
| Розміри | «Розміри 100 × 60 × 35 мм дозволяють носити пристрій у кишені чи сумці. Саме так його показано на зображенні нижче.» | «Розміри 100 × 60 × 35 мм дозволяють носити пристрій у кишені чи сумці. Об'єкт не треба везти до сканера — сканер їде до об'єкта.» |
| Підключення | «Сканер працює лише в парі з телефоном або ПК: автономного режиму немає. Одночасно підключається один пристрій. Три режими показано на зображенні.» | «…автономного режиму немає, і підключається один пристрій. Тому режим підключення визначає, де саме ви працюєте.» |
| Експорт | «…а прямого експорту в STP немає. Екрани з моделлю в сітці та з текстурою показано на зображенні.» | «Прямого експорту в STP немає, але STL і OBJ відкриваються в ПЗ для моделювання.» |
| Підпис | «На фото сканер Creality Pika в руці має вбудований сенсорний екран, на якому відображається кольорове зображення папуги…» | «Вбудований сенсорний екран сканера показує кольорове зображення папуги, тож попередній перегляд доступний прямо під час роботи.» |
| Заголовок | «Лазерне сканування без маркерів» | «Лазер без маркерів: лише з кабелем» |

---

## 9. Знахідка поза темою (фактична помилка у вході)

Vision-підпис малюнка з трьома екранами містив «керувати пристроєм можна без телефона чи ПК». Це суперечить абзацу «автономного режиму немає». У нових версіях фразу прибрано. Рекомендація: у Vision-промпті заборонити висновки про режими роботи, яких не видно на зображенні (додати до розділу Grounding rules: `State only what is visible; never infer operating modes, compatibility or requirements`).
