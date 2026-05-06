PRAGMA foreign_keys = ON;

-- ── Lookup tables ──────────────────────────────────────────────────────────────

CREATE TABLE `CardTypes` (
  `TypeID` INTEGER PRIMARY KEY,
  `Name`   TEXT NOT NULL UNIQUE  -- SPIRIT, MAGIC, NEXUS
);

CREATE TABLE `Sets` (
  `SetID` INTEGER PRIMARY KEY,
  `Name`  TEXT NOT NULL UNIQUE   -- BSS01, BSS02, ST01…
);

CREATE TABLE `Colors` (
  `ColorID` INTEGER PRIMARY KEY,
  `Name`    TEXT NOT NULL UNIQUE
);

CREATE TABLE `Symbols` (
  `SymbolID` INTEGER PRIMARY KEY,
  `Name`     TEXT,
  `Image`    TEXT,
  `ColorID`  INTEGER,
  FOREIGN KEY (`ColorID`) REFERENCES `Colors` (`ColorID`)
);

CREATE TABLE `Subtypes` (
  `SubtypeID` INTEGER PRIMARY KEY,
  `Name`      TEXT NOT NULL UNIQUE
);

CREATE TABLE `Keywords` (
  `KeywordID`   INTEGER PRIMARY KEY,
  `Name`        TEXT NOT NULL UNIQUE,
  `Target`      TEXT,
  `Value`       TEXT,
  `Description` TEXT
);

CREATE TABLE `Steps` (
  `StepID`      INTEGER PRIMARY KEY,
  `Name`        TEXT NOT NULL UNIQUE,  -- Main, Flash, Attack…
  `Description` TEXT
);

CREATE TABLE `Conditions` (
  `ConditionID` INTEGER PRIMARY KEY,
  `Description` TEXT NOT NULL UNIQUE   -- "When Summoned", "While This Spirit Attacks"…
);

-- ── Main card table ────────────────────────────────────────────────────────────

CREATE TABLE `Cards` (
  `CardID` TEXT    PRIMARY KEY,
  `Name`   TEXT,
  `TypeID` INTEGER NOT NULL,
  `SetID`  INTEGER NOT NULL,
  `Cost`   INTEGER,
  `Image`  TEXT,
  `Rarity` TEXT,
  FOREIGN KEY (`TypeID`) REFERENCES `CardTypes` (`TypeID`),
  FOREIGN KEY (`SetID`)  REFERENCES `Sets`      (`SetID`)
);

-- ── Card junction tables ───────────────────────────────────────────────────────

CREATE TABLE `CardColors` (
  `CardID`  TEXT    NOT NULL,
  `ColorID` INTEGER NOT NULL,
  PRIMARY KEY (`CardID`, `ColorID`),
  FOREIGN KEY (`CardID`)  REFERENCES `Cards`  (`CardID`),
  FOREIGN KEY (`ColorID`) REFERENCES `Colors` (`ColorID`)
);

CREATE TABLE `CardSymbols` (
  `CardID`   TEXT    NOT NULL,
  `SymbolID` INTEGER NOT NULL,
  PRIMARY KEY (`CardID`, `SymbolID`),
  FOREIGN KEY (`CardID`)   REFERENCES `Cards`   (`CardID`),
  FOREIGN KEY (`SymbolID`) REFERENCES `Symbols` (`SymbolID`)
);

CREATE TABLE `CardSubtypes` (
  `CardID`    TEXT    NOT NULL,
  `SubtypeID` INTEGER NOT NULL,
  PRIMARY KEY (`CardID`, `SubtypeID`),
  FOREIGN KEY (`CardID`)    REFERENCES `Cards`    (`CardID`),
  FOREIGN KEY (`SubtypeID`) REFERENCES `Subtypes` (`SubtypeID`)
);

-- Count = how many of that color (e.g. 2 red + 1 blue → two rows)
CREATE TABLE `CardReductions` (
  `CardID`  TEXT    NOT NULL,
  `ColorID` INTEGER NOT NULL,
  `Count`   INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (`CardID`, `ColorID`),
  FOREIGN KEY (`CardID`)  REFERENCES `Cards`  (`CardID`),
  FOREIGN KEY (`ColorID`) REFERENCES `Colors` (`ColorID`)
);

-- ── Core / level stats (SPIRIT and NEXUS only) ─────────────────────────────────

CREATE TABLE `Core` (
  `CoreID` INTEGER PRIMARY KEY,
  `CardID` TEXT    NOT NULL,
  `Level`  INTEGER NOT NULL,
  `BP`     INTEGER,           -- 0 for Nexus
  `Cores`  INTEGER,
  FOREIGN KEY (`CardID`) REFERENCES `Cards` (`CardID`)
);

-- ── Effects ────────────────────────────────────────────────────────────────────

CREATE TABLE `Effects` (
  `EffectID`    INTEGER PRIMARY KEY,
  `CardID`      TEXT    NOT NULL,
  `ConditionID` INTEGER,         -- nullable: some effects have no condition
  `Description` TEXT,
  FOREIGN KEY (`CardID`)      REFERENCES `Cards`      (`CardID`),
  FOREIGN KEY (`ConditionID`) REFERENCES `Conditions` (`ConditionID`)
);

-- Which core levels activate this effect (empty = level-independent)
CREATE TABLE `EffectLevels` (
  `EffectID` INTEGER NOT NULL,
  `CoreID`   INTEGER NOT NULL,
  PRIMARY KEY (`EffectID`, `CoreID`),
  FOREIGN KEY (`EffectID`) REFERENCES `Effects` (`EffectID`),
  FOREIGN KEY (`CoreID`)   REFERENCES `Core`    (`CoreID`)
);

-- Keywords on this effect, with optional numeric modifier (e.g. Ascend: 6)
CREATE TABLE `EffectKeywords` (
  `EffectID`  INTEGER NOT NULL,
  `KeywordID` INTEGER NOT NULL,
  `Modifier`  TEXT,             -- nullable; list modifiers stored as "4,5"
  PRIMARY KEY (`EffectID`, `KeywordID`),
  FOREIGN KEY (`EffectID`)  REFERENCES `Effects`  (`EffectID`),
  FOREIGN KEY (`KeywordID`) REFERENCES `Keywords` (`KeywordID`)
);

-- Turn steps when this effect can be activated (Main, Flash, etc.)
CREATE TABLE `EffectSteps` (
  `EffectID` INTEGER NOT NULL,
  `StepID`   INTEGER NOT NULL,
  PRIMARY KEY (`EffectID`, `StepID`),
  FOREIGN KEY (`EffectID`) REFERENCES `Effects` (`EffectID`),
  FOREIGN KEY (`StepID`)   REFERENCES `Steps`   (`StepID`)
);

-- ── Q&A ────────────────────────────────────────────────────────────────────────

CREATE TABLE `QA_cards` (
  `QA_cardID` INTEGER PRIMARY KEY,
  `CardID`    TEXT    NOT NULL,
  `Question`  TEXT,
  `Answer`    TEXT,
  FOREIGN KEY (`CardID`) REFERENCES `Cards` (`CardID`)
);

CREATE TABLE `QA_keywords` (
  `QA_keyID`  INTEGER PRIMARY KEY,
  `KeywordID` INTEGER NOT NULL,
  `Question`  TEXT,
  `Answer`    TEXT,
  FOREIGN KEY (`KeywordID`) REFERENCES `Keywords` (`KeywordID`)
);
