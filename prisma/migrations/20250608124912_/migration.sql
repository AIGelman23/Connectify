/*
  Warnings:

  - You are about to alter the column `education` on the `profiles` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "headline" TEXT,
    "resumeUrl" TEXT,
    "skills" JSONB,
    "education" JSONB,
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "profilePictureUrl" TEXT,
    "coverPhotoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_profiles" ("bio", "coverPhotoUrl", "createdAt", "education", "headline", "id", "isProfileComplete", "profilePictureUrl", "resumeUrl", "skills", "updatedAt", "userId") SELECT "bio", "coverPhotoUrl", "createdAt", "education", "headline", "id", "isProfileComplete", "profilePictureUrl", "resumeUrl", "skills", "updatedAt", "userId" FROM "profiles";
DROP TABLE "profiles";
ALTER TABLE "new_profiles" RENAME TO "profiles";
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
