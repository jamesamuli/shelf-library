# Legacy data model — inspection

Source: `../CDI_PROJECT/tables/bibli.sql` (MariaDB 10.1 dump, 514 tables,
`utf8`/`utf8_unicode_ci`). Nothing here has been migrated — this is
analysis only. Target design lives in [07-target-schema.md](07-target-schema.md).

## Core entities

Legacy names are French/English mixed; the "concept" column is the term
used from here on.

| Legacy table | Concept | Notes |
|---|---|---|
| `notices` | Bibliographic record | The central entity. `notice_id`, ~55 columns |
| `exemplaires` | Item (physical copy) | `expl_cb` barcode is the only UNIQUE key |
| `bulletins` | Serial issue | Items may hang off an issue instead of a record |
| `authors` | Author authority | `author_type` enum `70`/`71`/`72` = person / corporate body / congress |
| `publishers` | Publisher | |
| `collections` / `sub_collections` | Publisher collection | Two tables, but `collections.collection_parent` already self-nests |
| `series` | Series | |
| `noeuds` + `categories` | Subject (thesaurus) | `noeuds` = tree node, `categories` = per-language label. Genuinely normalized |
| `indexint` | Classification index | Dewey-style shelf classification |
| `empr` | Patron (borrower) | |
| `pret` | Active loan | |
| `pret_archive` | Loan history | Denormalized snapshot, see weak point 3 |
| `resa` / `resa_archive` | Hold / hold history | Same split as loans |
| `users` | Staff user | ~100 columns, identity + UI prefs + cataloging defaults |
| `acces_profiles` / `acces_rights` | ACL | Rules stored as a BLOB |
| `docs_location`, `docs_section`, `docs_statut`, `docs_codestat` | Item lookups | Location / shelf section / status / statistical code |
| `empr_categ`, `empr_statut` | Patron lookups | Category = fee + duration; status = ~20 `allow_*` flags |
| `notice_statut` | Record visibility status | Controls OPAC vs staff visibility |

## Key relationships

- `exemplaires.expl_notice` → `notices` **or** `expl_bulletin` → `bulletins`
  — exactly one should be set; both default to `0`, neither is enforced.
- `responsability` joins records to authors: `responsability_author`,
  `responsability_notice`, `responsability_fonction` (4-char UNIMARC
  relator code), `responsability_ordre`, and `responsability_type`
  (`0` principal / `1` other / `2` secondary — confirmed in
  `classes/notice.class.php:528,579,630`).
- `notices_categories` joins records to subject nodes (`num_noeud`),
  grouped by `num_vedette` (heading) with ordering columns.
- `notices.ed1_id` / `ed2_id` → `publishers`; `coll_id` / `subcoll_id` →
  collections. Fixed arity — a record can never have a third publisher.
- `notices.tparent_id` → parent record; `notices_relations` carries
  typed record-to-record links on top of that.
- `notices_langues` (composite PK) links records to language codes.
- `pret.pret_idexpl` → `exemplaires`, `pret_idempr` → `empr`.
- `noeuds.num_parent` self-nests the thesaurus; `path` holds a
  denormalized materialized path.

## Weak points

Verified against the dump, not assumed.

1. **No referential integrity anywhere.** `grep -c "FOREIGN KEY"` and
   `grep -c "CONSTRAINT"` both return **0** across all 514 tables. Every
   relationship above is enforced only by PHP — orphan rows are possible
   by construction, and no storage engine is pinned (`ENGINE=` appears 0
   times), so transactional behavior depends on server defaults.
2. **Sentinel values instead of NULL.** FK columns default to `0`
   ("none"), and `0000-00-00` appears **114 times** as a date default —
   invalid under modern MySQL strict mode and rejected outright by
   PostgreSQL. Every "is it set?" check is `!= 0` in PHP.
3. **Loans are not an append-only ledger.** `pret`'s primary key is
   `pret_idexpl` — the *item* id — so the table physically cannot hold
   more than one loan per copy and has no loan identity of its own.
   History is moved to `pret_archive`, which re-copies ~20 patron and
   item attributes (`arc_empr_categ`, `arc_expl_cote`, `arc_empr_sexe`…)
   as a snapshot. `resa`/`resa_archive` repeat the pattern. Consequence:
   loan history is a separate query path from active loans, and the two
   disagree over time.
4. **EAV custom fields, ~60 tables.** Each major entity carries
   `<entity>_custom`, `_custom_values`, `_custom_lists`, `_custom_dates`.
   `notices_custom_values` has **no primary key** and five nullable typed
   columns (`_small_text`, `_text`, `_integer`, `_date`, `_float`), one
   of which is populated per row.
5. **Search index lives in the OLTP schema.** `mots` (word dictionary),
   `notices_mots_global_index`, `notices_global_index`, plus `index_*`
   columns on nearly every entity (`index_author`, `index_publisher`,
   `notices.index_sew`/`index_wew`/`index_l`…). All maintained by
   application code, all able to drift from the source data.
6. **Fixed-arity repeated columns.** `notices.tit1..tit4`,
   `ed1_id`/`ed2_id`, `empr_adr1`/`adr2`, `empr_tel1`/`tel2`.
7. **Type abuse.** `notices.thumbnail_url` is a `mediumblob` holding a
   URL; `notices.prix` and `exemplaires.expl_prix` are `varchar(255)` for
   money; `notices.year` is `varchar(50)`; `users.environnement` and
   `acces_profiles.prf_rule` are serialized BLOBs.
8. **Password handling.** `empr.empr_password_is_encrypted` is a flag —
   meaning plaintext passwords are a supported state — and
   `users.pwd` is `varchar(50)`, too short for a modern hash.
9. **Unqueryable permissions.** `users.rights` is an integer bitmask and
   ACL rules are BLOBs, so "who can do X" cannot be answered in SQL.
10. **Naming.** French, English and abbreviations mix freely — `empr`,
    `pret`, `noeuds`, `cb` (code-barre), `expl`, `tit`, `npages` — and
    four unrelated tables are called some form of *statut*
    (`docs_statut`, `empr_statut`, `notice_statut`, `authorities_statuts`).
11. **`responsability` has a composite primary key that includes its own
    auto-increment column**, so the surrogate key guarantees nothing.
12. **`utf8` is MySQL's 3-byte encoding**, not `utf8mb4` — some CJK and
    all emoji cannot be stored.

## What is genuinely worth keeping

Not everything is bad, and the target schema preserves these:

- The **`noeuds` / `categories` split** (tree structure separate from
  per-language labels) is correct thesaurus modeling.
- **`niveau_biblio`** (`a` analytic / `m` monograph / `s` serial /
  `b` bulletin) and **`niveau_hierar`** (`0` standalone / `1` parent /
  `2` child) are a compact, working model of bibliographic level — they
  become enums rather than being discarded.
- **UNIMARC relator codes** on `responsability_fonction` are a real
  standard and should survive as-is.
- Separating **item status / location / section / statistical code** into
  their own lookups is the right shape.
