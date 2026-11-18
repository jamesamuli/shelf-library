-- Genres for the OPAC home's "Découvrir" tiles. Legacy PMB has no genre
-- field; see docs/16-opac-home.md for why subjects are not a substitute.
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_en" TEXT,
    "icon" TEXT NOT NULL,
    "colour" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

CREATE TABLE "record_genres" (
    "record_id" INTEGER NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "record_genres_pkey" PRIMARY KEY ("record_id","genre_id")
);

CREATE INDEX "record_genres_genre_id_idx" ON "record_genres"("genre_id");

ALTER TABLE "record_genres" ADD CONSTRAINT "record_genres_record_id_fkey"
    FOREIGN KEY ("record_id") REFERENCES "bibliographic_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "record_genres" ADD CONSTRAINT "record_genres_genre_id_fkey"
    FOREIGN KEY ("genre_id") REFERENCES "genres"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- The starting set the CDI asked for. Seeded here rather than in seed.ts so
-- every environment, production included, opens with working tiles.
INSERT INTO "genres" ("slug", "label_fr", "label_en", "icon", "colour", "rank") VALUES
    ('bandes-dessinees', 'Bandes dessinées',      'Comics',               'speech',       'indigo',    1),
    ('romans',           'Romans',                'Novels',               'book',         'teal',      2),
    ('albums',           'Albums',                'Picture books',        'picture-book', 'forest',    3),
    ('fictions',         'Fictions',              'Fiction',              'wand',         'slate',     4),
    ('theatre',          'Théâtre',               'Drama',                'masks',        'raspberry', 5),
    ('contes-poesie',    'Contes et poésie',      'Tales and poetry',     'feather',      'violet',    6),
    ('documentaires',    'Livres documentaires',  'Non-fiction',          'open-book',    'ochre',     7),
    ('revues',           'Revues et magazines',   'Magazines',            'newspaper',    'plum',      8);
