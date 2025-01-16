CREATE TABLE "References" (
  "reference_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "thumbnail" BLOB,
  "filepath" TEXT NOT NULL,
  "title" INTEGER NOT NULL,
  "selected" BOOLEAN NOT NULL
);

CREATE TABLE "Steps" (
  "step_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "reference_id" INTEGER NOT NULL,
  "timestamp" REAL NOT NULL,
  "pose" TEXT NOT NULL,
  FOREIGN KEY ("reference_id") REFERENCES "References" ("reference_id")
);

CREATE TABLE "Sessions" (
  "session_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "reference_id" INTEGER NOT NULL,
  FOREIGN KEY ("reference_id") REFERENCES "References" ("reference_id")
);

CREATE TABLE "Dancers" (
  "dancer_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "session_id" INTEGER NOT NULL,
  "avatar" BLOB,
  "score" INTEGER NOT NULL,
  FOREIGN KEY ("session_id") REFERENCES "Sessions" ("session_id")
);

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;
