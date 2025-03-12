CREATE TABLE `Cards` (
  `CardID` TEXT PRIMARY KEY,
  `Name` TEXT,
  `Type` TEXT,
  `Cost` INTEGER,
  `ColorID` INTEGER,
  `SymbolID` INTEGER,
  `SubtypeID` INTEGER,
  `Image` TEXT,
  FOREIGN KEY (`ColorID`) REFERENCES `Colors` (`ColorID`),
  FOREIGN KEY (`SymbolID`) REFERENCES `Symbols` (`SymbolID`),
  FOREIGN KEY (`SubtypeID`) REFERENCES `Subtypes` (`SubtypeID`)
);

CREATE TABLE `Keywords` (
  `KeywordID` INTEGER PRIMARY KEY,
  `Name` TEXT,
  `Target` TEXT,
  `Value` TEXT
);

CREATE TABLE `Effects` (
  `EffectID` INTEGER PRIMARY KEY,
  `CardID` TEXT,
  `Core_reqID` INTEGER,
  `ConditionID` INTEGER,
  `KeywordID` INTEGER,
  `StepID` INTEGER,
  `Description` TEXT,
  FOREIGN KEY (`CardID`) REFERENCES `Cards` (`CardID`),
  FOREIGN KEY (`Core_reqID`) REFERENCES `core` (`CoreID`),
  FOREIGN KEY (`ConditionID`) REFERENCES `Conditions` (`ConditionID`),
  FOREIGN KEY (`KeywordID`) REFERENCES `Keywords` (`KeywordID`),
  FOREIGN KEY (`StepID`) REFERENCES `Steps` (`StepID`)
);

CREATE TABLE `Steps` (
  `StepID` INTEGER PRIMARY KEY,
  `Name` TEXT,
  `Description` TEXT
);

CREATE TABLE `Conditions` (
  `ConditionID` INTEGER PRIMARY KEY,
  `Description` TEXT
);

CREATE TABLE `Subtypes` (
  `SubtypeID` INTEGER PRIMARY KEY,
  `Name` TEXT
);

CREATE TABLE `Symbols` (
  `SymbolID` INTEGER PRIMARY KEY,
  `Name` TEXT,
  `Image` TEXT
);

CREATE TABLE `Colors` (
  `ColorID` INTEGER PRIMARY KEY,
  `Name` TEXT
);

CREATE TABLE `core` (
  `CoreID` INTEGER PRIMARY KEY,
  `CardID` TEXT,
  `Level` INTEGER,
  `BP` INTEGER,
  `Cores` INTEGER,
  FOREIGN KEY (`CardID`) REFERENCES `Cards` (`CardID`)
);

CREATE TABLE `QA_cards` (
  `QA_cardID` INTEGER PRIMARY KEY,
  `CardID` TEXT,
  `Question` TEXT,
  `Answer` TEXT,
  FOREIGN KEY (`CardID`) REFERENCES `Cards` (`CardID`)
);

CREATE TABLE `QA_keywords` (
  `QA_keyID` INTEGER PRIMARY KEY,
  `KeywordsID` INTEGER,
  `Question` TEXT,
  `Answer` TEXT,
  FOREIGN KEY (`KeywordsID`) REFERENCES `Keywords` (`KeywordID`)
);

-- Enable foreign key constraints for the session
PRAGMA foreign_keys = ON;
