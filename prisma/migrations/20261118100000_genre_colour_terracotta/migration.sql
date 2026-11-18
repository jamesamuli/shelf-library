-- The "slate" tile colour is gone: the CDI found the Découvrir tiles too
-- pale, and slate — a cool grey-blue — was the dullest of the eight. Its
-- replacement is a warm terracotta. genres.colour is a key into a closed set
-- in app/catalogue/_components/genre-tile.tsx, so rows still pointing at the
-- old key are moved across rather than left to fall back silently.
UPDATE "genres" SET "colour" = 'terracotta' WHERE "colour" = 'slate';
