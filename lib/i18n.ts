import type { Sort } from "./catalogue";
import type { ReserveRefusal } from "./holds";
import type { Locale } from "./preferences";

/**
 * Translations for the authentication screens — the only UI that exists.
 *
 * Deliberately a plain typed dictionary rather than an i18n library: two
 * locales and one feature do not justify a dependency, and reading the locale
 * on the server means no client-side i18n runtime. Revisit if the app grows a
 * third locale or pluralisation/date-formatting needs.
 *
 * Every value is a plain string — no functions. The dictionary is passed to
 * Client Components, and functions cannot cross that boundary. Placeholders
 * use {braces} and are filled with `fill()`.
 */

type PortalCopy = {
  name: string;
  subtitle: string;
  /** Who signs in here, under the card's icon. */
  audience: string;
  /** How they sign in, under "Se connecter". */
  signInHint: string;
};

/** Only staff have a username field: readers sign in with Google. */
type StaffPortalCopy = PortalCopy & {
  identifierLabel: string;
  identifierPlaceholder: string;
};

type GoogleCopy = {
  signIn: string;
  /** Shown for a moment in the popup before it closes. */
  signedIn: string;
  /** Keyed by the `?google=` failure code the callback sends back. */
  errors: {
    cancelled: string;
    invalid: string;
    domain: string;
    "no-account": string;
    unavailable: string;
  };
};

type CatalogueCopy = {
  title: string;
  intro: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchAction: string;
  resultsCount: string;
  resultsFor: string;
  browsingAll: string;
  noResults: string;
  noResultsHint: string;
  available: string;
  allOnLoan: string;
  noHoldings: string;
  copies: string;
  previous: string;
  next: string;
  pageOf: string;
  backToResults: string;
  authors: string;
  publisher: string;
  year: string;
  isbn: string;
  subjects: string;
  collection: string;
  series: string;
  classification: string;
  abstract: string;
  documentType: string;
  holdings: string;
  barcode: string;
  callNumber: string;
  location: string;
  section: string;
  itemStatus: string;
  onLoanUntil: string;
  onShelf: string;
  notFound: string;
  notFoundHint: string;
  myAccount: string;
  welcomeTitle: string;
  welcomeSchool: string;
  newArrivals: string;
  seeMore: string;
  scrollBack: string;
  scrollForward: string;
  searchPanelTitle: string;
  searchTipsTitle: string;
  searchTips: string[];
  searching: string;
  /** Contains a {count} placeholder. */
  seeAllResults: string;
  discover: string;
  /** Names the phone's bottom bar. */
  dockLabel: string;
  practicalTitle: string;
  hoursTitle: string;
  borrowTitle: string;
  /** Contains a {days} placeholder. */
  borrowText: string;
  renewTitle: string;
  /** Contains a {count} placeholder; the account link follows it. */
  renewText: string;
  returnTitle: string;
  returnText: string;
  placeTitle: string;
  emailTitle: string;
  phoneTitle: string;
  closePanel: string;
  genres: string;
  resultsTitle: string;
  /** Contains {from}, {to} and {total} placeholders. */
  resultsRange: string;
  filterTitle: string;
  filterFormat: string;
  filterGenre: string;
  filterLanguage: string;
  /** Contains a {count} placeholder: the active filters. */
  filtersButton: string;
  clearFilters: string;
  /** Contains a {label} placeholder. */
  removeFilter: string;
  viewLabel: string;
  viewList: string;
  viewDetailed: string;
  sortLabel: string;
  sortApply: string;
  sorts: Record<Sort, string>;
  locate: string;
  language: string;
  paginationLabel: string;
  paginationEndLabel: string;
  /** Contains a {page} placeholder. */
  pageLink: string;
  locateBook: string;
  reserveBook: string;
  /** Contains a {title} placeholder. */
  copiesTitle: string;
  /** Contains a {count} placeholder. */
  copiesFound: string;
  copiesHint: string;
  colCopy: string;
  colPlace: string;
  colAvailability: string;
  colAcquired: string;
  copyAvailable: string;
  /** Contains a {title} placeholder. */
  reserveTitle: string;
  /** Contains a {days} placeholder. */
  reserveIntro: string;
  reserveConfirm: string;
  cancel: string;
  /** Contains a {title} placeholder. */
  reserveOk: string;
  reserveErrors: Record<ReserveRefusal, string>;
  like: string;
  unlike: string;
  /** Contains a {count} placeholder. */
  likeCount: string;
  recommend: string;
  linkCopied: string;
  /** Contains a {title} placeholder. */
  shareText: string;
  /** Contains a {name} placeholder. */
  authorBooks: string;
  noBiography: string;
  noPublisherDescription: string;
  authorWebsite: string;
  favoritesTitle: string;
  noFavorites: string;
  holdsTitle: string;
  noHolds: string;
  colPlacedOn: string;
  holdWaiting: string;
  /** Contains a {date} placeholder. */
  holdReady: string;
  collation: string;
  ean: string;
  publishedIn: string;
  edition: string;
  dimensions: string;
  breadcrumbLabel: string;
  home: string;
  catalogueCrumb: string;
  details: string;
  signInReserveTitle: string;
  signInLikeTitle: string;
  signInSchoolHint: string;
  moreInfo: string;
  authorLoading: string;
  authorBooksShort: string;
  /** Contains a {count} placeholder. */
  authorAllBooks: string;
};

type CirculationCopy = {
  navDashboard: string;
  navCirculation: string;
  navCatalogue: string;
  dashboardTitle: string;
  dashboardIntro: string;
  statRecords: string;
  statItems: string;
  statPatrons: string;
  statActiveLoans: string;
  statOverdue: string;
  recentLoans: string;
  noRecentLoans: string;
  colMember: string;
  colDocument: string;
  colLoanedOn: string;
  colDueOn: string;
  colStatus: string;
  statusOnLoan: string;
  /** Contains a {count} placeholder. */
  statusLate: string;
  deskTitle: string;
  deskIntro: string;
  patronLabel: string;
  patronPlaceholder: string;
  patronFind: string;
  patronNotFound: string;
  patronChange: string;
  patronCategoryLabel: string;
  patronMembershipLabel: string;
  patronExpiresOn: string;
  patronNoExpiry: string;
  /** Contains {used} and {quota} placeholders. */
  patronQuota: string;
  patronQuotaNone: string;
  checkOutTitle: string;
  checkOutIntro: string;
  itemLabel: string;
  itemPlaceholder: string;
  checkOutAction: string;
  checkOutAnyway: string;
  checkInTitle: string;
  checkInIntro: string;
  checkInAction: string;
  loansTitle: string;
  noLoans: string;
  renewAction: string;
  renewAnyway: string;
  returnAction: string;
  colRenewals: string;
  /** Contains a {date} placeholder. */
  dueOnDate: string;
  /** Contains {title} and {date} placeholders. */
  checkOutOk: string;
  /** Contains {title} and {name} placeholders. */
  checkInOk: string;
  /** Contains {title} and {count} placeholders. */
  checkInLate: string;
  /** Contains {title} and {date} placeholders. */
  renewOk: string;
  errPatronNotFound: string;
  errItemNotFound: string;
  errPatronExpired: string;
  errPatronBlocked: string;
  errPatronNotAllowed: string;
  /** Contains a {detail} placeholder. */
  errItemNotLoanable: string;
  errAlreadyOnLoanHere: string;
  /** Contains a {detail} placeholder. */
  errAlreadyOnLoanElsewhere: string;
  /** Contains a {detail} placeholder. */
  errQuotaReached: string;
  /** Shown when the signed-in account lacks the privilege for an action. */
  errForbidden: string;
  errNotOnLoan: string;
  errLoanNotFound: string;
  errRenewNotAllowed: string;
  errRenewLimit: string;
  errRenewNoLaterDate: string;
  accountTitle: string;
  accountCurrent: string;
  accountHistory: string;
  accountNoCurrent: string;
  accountNoHistory: string;
  accountReturnedOn: string;
  accountRenewHint: string;
};

type CataloguingCopy = {
  navCataloguing: string;
  listTitle: string;
  listIntro: string;
  searchPlaceholder: string;
  searchAction: string;
  newRecord: string;
  colTitle: string;
  colAuthors: string;
  colType: string;
  colStatus: string;
  colCopies: string;
  noRecords: string;
  edit: string;
  backToList: string;
  newRecordTitle: string;
  editRecordTitle: string;
  fieldTitle: string;
  fieldSubtitle: string;
  fieldIsbn: string;
  fieldYear: string;
  fieldAbstract: string;
  fieldDocumentType: string;
  fieldStatus: string;
  fieldAuthors: string;
  fieldPublishers: string;
  fieldSubjects: string;
  fieldGenres: string;
  hintGenres: string;
  hintOnePerLine: string;
  hintAuthorFormat: string;
  optionNone: string;
  save: string;
  saved: string;
  deleteRecord: string;
  copiesTitle: string;
  addCopy: string;
  noCopies: string;
  fieldBarcode: string;
  fieldCallNumber: string;
  fieldLocation: string;
  fieldSection: string;
  fieldItemStatus: string;
  saveCopy: string;
  deleteCopy: string;
  copySaved: string;
  copyDeleted: string;
  recordDeleted: string;
  onLoanFlag: string;
  errTitleRequired: string;
  errYearInvalid: string;
  /** Contains a {detail} placeholder. */
  errHasCopies: string;
  errNotFound: string;
  errBarcodeRequired: string;
  errBarcodeTaken: string;
  /** Contains a {detail} placeholder. */
  errOnLoan: string;
  assistantTitle: string;
  checkAuthors: string;
  checkAuthorsHint: string;
  checking: string;
  suggestedAuthors: string;
  useSuggested: string;
  nothingToCheck: string;
  matchIdentifier: string;
  matchName: string;
  matchSurname: string;
  titlesInCdi: string;
  hasBiography: string;
  noBiography: string;
  thisIsThem: string;
  newAuthor: string;
  noCandidate: string;
  proposeBiography: string;
  proposeAbstract: string;
  aiWorking: string;
  aiUsage: string;
  aiCached: string;
  aiLimit: string;
  aiFailed: string;
  aiNotConfigured: string;
  samePersonYes: string;
  samePersonNo: string;
  samePersonUnsure: string;
  biographyDraft: string;
  datesLabel: string;
  sources: string;
  keepBiography: string;
  discard: string;
  biographyKept: string;
  abstractUnknown: string;
  abstractReplace: string;
  abstractFilled: string;
  reviewNote: string;
};

type ReadersCopy = {
  navReaders: string;
  title: string;
  intro: string;
  formTitle: string;
  formIntro: string;
  fieldEmail: string;
  fieldEmailHint: string;
  fieldLastName: string;
  fieldFirstName: string;
  fieldBarcode: string;
  fieldBarcodeHint: string;
  fieldLogin: string;
  fieldLoginHint: string;
  fieldGender: string;
  genderFemale: string;
  genderMale: string;
  fieldClass: string;
  fieldCategory: string;
  fieldStatus: string;
  fieldEnrolledOn: string;
  fieldExpiresOn: string;
  fieldNotes: string;
  optionNone: string;
  /** Contains a {label} placeholder. */
  schoolYearHint: string;
  create: string;
  /** Contains {name} and {barcode} placeholders. */
  created: string;
  noPasswordNotice: string;
  errRequired: string;
  errEmailInvalid: string;
  errEmailTaken: string;
  errBarcodeTaken: string;
  errLoginTaken: string;
  errDateInvalid: string;
  errDateOrder: string;
  errClassUnknown: string;
  importTitle: string;
  importIntro: string;
  downloadTemplate: string;
  fileLabel: string;
  fileHint: string;
  analyse: string;
  /** Contains {valid} and {rejected} placeholders. */
  previewSummary: string;
  colLine: string;
  colEmail: string;
  colName: string;
  colClass: string;
  colBarcode: string;
  colProblem: string;
  barcodeAuto: string;
  confirmImport: string;
  cancelImport: string;
  /** Contains a {count} placeholder. */
  imported: string;
  /** Contains a {count} placeholder. */
  importedWithRejects: string;
  downloadRejects: string;
  errFileEmpty: string;
  errNoEmailColumn: string;
  errNoValidRows: string;
  errDuplicateInFile: string;
  errUnknownValue: string;
};

type HoldsCopy = {
  navHolds: string;
  title: string;
  intro: string;
  tabCurrent: string;
  tabOutdated: string;
  tabReshelving: string;
  noCurrent: string;
  noOutdated: string;
  noReshelving: string;
  colReader: string;
  colDocument: string;
  colPlacedAt: string;
  colUntil: string;
  colCopy: string;
  colLocation: string;
  colActions: string;
  waitingForCopy: string;
  /** Contains a {date} placeholder. */
  keptUntil: string;
  /** Contains a {count} placeholder. */
  lateBy: string;
  onLoanFlag: string;
  newTitle: string;
  newIntro: string;
  fieldReaderCard: string;
  fieldDocumentBarcode: string;
  place: string;
  assignTitle: string;
  assign: string;
  cancel: string;
  lend: string;
  reshelvingTitle: string;
  reshelvingIntro: string;
  clear: string;
  /** Contains a {title} placeholder. */
  placed: string;
  /** Contains a {barcode} placeholder. */
  assigned: string;
  cancelled: string;
  /** Contains a {title} placeholder. */
  lent: string;
  /** Contains a {barcode} placeholder. */
  cleared: string;
  errHoldNotFound: string;
  errPatronNotFound: string;
  errItemNotFound: string;
  errRecordNotFound: string;
  errPatronNotAllowed: string;
  errAlreadyHeld: string;
  errItemOnLoan: string;
  /** Both contain a {barcode} placeholder. */
  errItemWrongTitle: string;
  errItemAlreadySetAside: string;
  errNoCopyAssigned: string;
};

type StaffCopy = {
  navStaff: string;
  title: string;
  intro: string;
  colUser: string;
  colRoles: string;
  colPermissions: string;
  save: string;
  noPermissions: string;
  inactive: string;
  rolesTitle: string;
  rolesIntro: string;
  /** Contains a {name} placeholder. */
  saved: string;
  errNotFound: string;
  errLastAdmin: string;
};

type Messages = {
  catalogue: CatalogueCopy;
  circulation: CirculationCopy;
  cataloguing: CataloguingCopy;
  readers: ReadersCopy;
  holds: HoldsCopy;
  staff: StaffCopy;
  brandTagline: string;
  /** First line of the sign-in heading; the school's name follows, as on the home. */
  signInTitle: string;
  /** Names the two-tab switch on the sign-in page. */
  signInChoice: string;
  google: GoogleCopy;
  accessDeniedTitle: string;
  accessDeniedHint: string;
  /** Both contain a {section} placeholder. */
  expandSection: string;
  collapseSection: string;
  portals: { gestion: StaffPortalCopy; opac: PortalCopy };
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  forgotPassword: string;
  signIn: string;
  skipToContent: string;
  home: string;
  /** Shown when the pointer rests on a book drifting behind the sign-in page. */
  quotes: { text: string; author: string }[];
  signingIn: string;
  noAccount: string;
  forgotTitle: string;
  forgotGestion: string;
  backToSignIn: string;
  /** Both contain a {name} placeholder. */
  greetingFirst: string;
  greetingReturning: string;
  signedInAs: string;
  signOut: string;
  themeLabel: string;
  /** Short labels on the theme switch, beside its icon. */
  themeDark: string;
  themeLight: string;
  toLight: string;
  toDark: string;
  languageLabel: string;
  /** Contains a {label} placeholder. */
  identifierRequired: string;
  passwordRequired: string;
  badCredentials: string;
  backendUnavailable: string;
};

const fr: Messages = {
  catalogue: {
    title: "Catalogue",
    intro: "Recherchez des livres, des auteurs, des sujets et plus encore.",
    searchLabel: "Rechercher dans le catalogue",
    searchPlaceholder: "Rechercher un livre, un auteur, un sujet…",
    searchAction: "Rechercher",
    resultsCount: "{count} résultat(s)",
    resultsFor: "pour « {query} »",
    browsingAll: "Tout le catalogue",
    noResults: "Aucun résultat",
    noResultsHint:
      "Vérifiez l’orthographe, essayez moins de mots, ou un terme plus général.",
    available: "{count} disponible(s)",
    allOnLoan: "Tous empruntés",
    noHoldings: "Aucun exemplaire",
    copies: "{count} exemplaire(s)",
    previous: "Précédent",
    next: "Suivant",
    pageOf: "Page {page} sur {pageCount}",
    backToResults: "Retour au catalogue",
    authors: "Auteur(s)",
    publisher: "Éditeur",
    year: "Année",
    isbn: "ISBN",
    subjects: "Sujets",
    collection: "Collection",
    series: "Série",
    classification: "Cote de classement",
    abstract: "Résumé",
    documentType: "Type de document",
    holdings: "Exemplaires",
    barcode: "Code-barres",
    callNumber: "Cote",
    location: "Localisation",
    section: "Section",
    itemStatus: "Statut",
    onLoanUntil: "Emprunté jusqu’au {date}",
    onShelf: "En rayon",
    notFound: "Notice introuvable",
    notFoundHint: "Cette notice n’existe pas ou n’est pas publiée au catalogue.",
    myAccount: "Mon compte",
    welcomeTitle: "Bienvenue au CDI",
    welcomeSchool: "École Française de Bujumbura",
    newArrivals: "Nouveautés",
    seeMore: "Voir plus",
    scrollBack: "Nouveautés précédentes",
    scrollForward: "Nouveautés suivantes",
    searchPanelTitle: "Rechercher un document",
    searchTipsTitle: "Astuces",
    searching: "Recherche…",
    seeAllResults: "Voir les {count} résultats",
    searchTips: [
      "Mélangez titre et auteur : « camus peste » fonctionne.",
      "Les accents sont facultatifs : « etranger » trouve « L’Étranger ».",
      "Le début d’un mot suffit : « biblio » trouve « bibliothèque ».",
    ],
    discover: "Découvrir",
    dockLabel: "Explorer le catalogue",
    practicalTitle: "Infos pratiques",
    hoursTitle: "Horaires",
    borrowTitle: "Emprunter",
    borrowText: "Jusqu’à {days} jours par document.",
    renewTitle: "Prolonger",
    renewText: "Jusqu’à {count} fois, en ligne depuis",
    returnTitle: "Rendre",
    returnText: "Au comptoir du CDI.",
    placeTitle: "Nous trouver",
    emailTitle: "Écrire au CDI",
    phoneTitle: "Téléphone",
    closePanel: "Fermer",
    genres: "Genre(s)",
    resultsTitle: "Résultats de recherche",
    resultsRange: "Résultats : {from} à {to} sur un total de {total}",
    filterTitle: "Filtrer la recherche",
    filterFormat: "Support",
    filterGenre: "Genre",
    filterLanguage: "Langue",
    filtersButton: "Filtres ({count})",
    clearFilters: "Effacer les filtres",
    removeFilter: "Retirer le filtre « {label} »",
    viewLabel: "Affichage",
    viewList: "Liste",
    viewDetailed: "Étendu",
    sortLabel: "Trier par",
    sortApply: "Trier",
    sorts: {
      pertinence: "Pertinence",
      titre: "Titre (A → Z)",
      auteur: "Auteur (A → Z)",
      recent: "Plus récents",
      annee: "Année de parution",
    },
    locate: "Localiser le document",
    language: "Langue",
    paginationLabel: "Pages de résultats",
    paginationEndLabel: "Pages de résultats, fin de liste",
    pageLink: "Page {page}",
    locateBook: "Localiser le livre",
    reserveBook: "Réserver le livre",
    copiesTitle: "Liste des exemplaires de « {title} »",
    copiesFound: "{count} exemplaire(s) trouvé(s).",
    copiesHint: "Notez la cote : elle indique le rayon où le livre est rangé. L’équipe du CDI peut vous aider à le trouver.",
    colCopy: "N° d’exemplaire",
    colPlace: "Emplacement",
    colAvailability: "Disponibilité",
    colAcquired: "Date d’acquisition",
    copyAvailable: "Disponible",
    reserveTitle: "Réserver « {title} »",
    reserveIntro: "Le CDI mettra un exemplaire de côté pour vous dès qu’il sera libre. Vous aurez ensuite {days} jours pour venir le chercher.",
    reserveConfirm: "Confirmer la réservation",
    cancel: "Annuler",
    reserveOk: "C’est noté : « {title} » est réservé pour vous. Vous retrouverez vos réservations dans Mon compte.",
    reserveErrors: {
      PATRON_NOT_ALLOWED: "Votre compte ne permet pas de réserver. Adressez-vous à l’équipe du CDI.",
      RECORD_NOT_FOUND: "Ce livre n’est plus au catalogue.",
      NO_LOANABLE_COPY: "Ce document ne s’emprunte pas : il se consulte sur place.",
      ALREADY_HELD: "Vous avez déjà réservé ce livre.",
      ALREADY_ON_LOAN: "Vous avez déjà ce livre en prêt.",
    },
    like: "J’aime",
    unlike: "Je n’aime plus",
    likeCount: "{count} j’aime",
    recommend: "Recommander",
    linkCopied: "Lien copié",
    shareText: "Je te recommande « {title} », au CDI de l’École Française de Bujumbura.",
    authorBooks: "Les livres de {name} au CDI",
    noBiography: "Le CDI n’a pas encore rédigé de biographie pour cet auteur.",
    noPublisherDescription: "Le CDI n’a pas encore rédigé de description pour cet éditeur.",
    authorWebsite: "Site web",
    favoritesTitle: "Mes favoris",
    noFavorites: "Aucun favori pour l’instant. Touchez le cœur sous un livre pour le retrouver ici.",
    holdsTitle: "Mes réservations",
    noHolds: "Aucune réservation en cours.",
    colPlacedOn: "Réservé le",
    holdWaiting: "En attente d’un exemplaire",
    holdReady: "À retirer au CDI avant le {date}",
    collation: "Collation",
    ean: "EAN",
    publishedIn: "Publié en {year}",
    edition: "Édition",
    dimensions: "Format",
    breadcrumbLabel: "Vous êtes ici",
    home: "Accueil",
    catalogueCrumb: "Catalogue",
    details: "Détails",
    signInReserveTitle: "Connectez-vous pour réserver ce livre",
    signInLikeTitle: "Connectez-vous pour aimer ce livre",
    signInSchoolHint: "Utilisez votre compte Google de l’école (adresse en @efbujumbura.com).",
    moreInfo: "En savoir plus",
    authorLoading: "Chargement…",
    authorBooksShort: "Ses livres au CDI",
    authorAllBooks: "Voir tous ses livres ({count})",
  },
  circulation: {
    navDashboard: "Tableau de bord",
    navCirculation: "Circulation",
    navCatalogue: "Catalogue",
    dashboardTitle: "Bonjour, {name}",
    dashboardIntro: "Voici un aperçu de votre bibliothèque aujourd’hui.",
    statRecords: "Notices",
    statItems: "Exemplaires",
    statPatrons: "Lecteurs",
    statActiveLoans: "Emprunts en cours",
    statOverdue: "Retards",
    recentLoans: "Emprunts récents",
    noRecentLoans: "Aucun emprunt en cours.",
    colMember: "Lecteur",
    colDocument: "Document",
    colLoanedOn: "Emprunté le",
    colDueOn: "Échéance",
    colStatus: "Statut",
    statusOnLoan: "En cours",
    statusLate: "En retard de {count} j",
    deskTitle: "Circulation",
    deskIntro: "Prêts et retours. Scannez ou saisissez un code-barres.",
    patronLabel: "Numéro de carte du lecteur",
    patronPlaceholder: "E-2026-0001",
    patronFind: "Ouvrir la fiche",
    patronNotFound: "Aucun lecteur avec ce numéro de carte.",
    patronChange: "Changer de lecteur",
    patronCategoryLabel: "Catégorie",
    patronMembershipLabel: "Adhésion",
    patronExpiresOn: "Adhésion jusqu’au {date}",
    patronNoExpiry: "Adhésion sans échéance",
    patronQuota: "{used} sur {quota} emprunts",
    patronQuotaNone: "{used} emprunt(s), sans quota",
    checkOutTitle: "Prêt",
    checkOutIntro: "Le document est prêté au lecteur ouvert ci-dessus.",
    itemLabel: "Code-barres du document",
    itemPlaceholder: "CDI-000001",
    checkOutAction: "Prêter",
    checkOutAnyway: "Prêter quand même",
    checkInTitle: "Retour",
    checkInIntro: "Aucun lecteur n’est nécessaire pour enregistrer un retour.",
    checkInAction: "Enregistrer le retour",
    loansTitle: "Emprunts en cours",
    noLoans: "Aucun emprunt en cours.",
    renewAction: "Prolonger",
    renewAnyway: "Prolonger quand même",
    returnAction: "Retour",
    colRenewals: "Prolongations",
    dueOnDate: "Jusqu’au {date}",
    checkOutOk: "« {title} » prêté jusqu’au {date}.",
    checkInOk: "« {title} » rendu par {name}.",
    checkInLate: "« {title} » rendu avec {count} jour(s) de retard.",
    renewOk: "« {title} » prolongé jusqu’au {date}.",
    errPatronNotFound: "Lecteur introuvable.",
    errItemNotFound: "Aucun exemplaire avec ce code-barres.",
    errPatronExpired: "L’adhésion de ce lecteur est expirée.",
    errPatronBlocked: "Ce lecteur est suspendu.",
    errPatronNotAllowed: "Le statut de ce lecteur n’autorise pas le prêt.",
    errItemNotLoanable: "Document exclu du prêt ({detail}).",
    errAlreadyOnLoanHere: "Ce document est déjà emprunté par ce lecteur.",
    errAlreadyOnLoanElsewhere: "Ce document est déjà emprunté par {detail}.",
    errQuotaReached: "Quota atteint ({detail} emprunts).",
    errForbidden: "Votre compte n’a pas le droit d’effectuer cette action.",
    errNotOnLoan: "« {detail} » n’était pas en prêt.",
    errLoanNotFound: "Cet emprunt n’est plus en cours.",
    errRenewNotAllowed: "Le statut de ce lecteur n’autorise pas la prolongation.",
    errRenewLimit: "Nombre maximal de prolongations atteint.",
    errRenewNoLaterDate: "La prolongation dépasserait la fin de l’adhésion.",
    accountTitle: "Mes emprunts",
    accountCurrent: "En cours",
    accountHistory: "Historique",
    accountNoCurrent: "Vous n’avez aucun emprunt en cours.",
    accountNoHistory: "Aucun emprunt rendu pour l’instant.",
    accountReturnedOn: "Rendu le {date}",
    accountRenewHint:
      "Vous pouvez prolonger un emprunt deux fois, sauf s’il dépasse la fin de votre adhésion.",
  },
  cataloguing: {
    navCataloguing: "Catalogage",
    listTitle: "Catalogage",
    listIntro: "Créez et modifiez les notices et leurs exemplaires.",
    searchPlaceholder: "Titre, auteur ou ISBN…",
    searchAction: "Rechercher",
    newRecord: "Nouvelle notice",
    colTitle: "Titre",
    colAuthors: "Auteur(s)",
    colType: "Type",
    colStatus: "Statut",
    colCopies: "Exemplaires",
    noRecords: "Aucune notice.",
    edit: "Modifier",
    backToList: "Retour à la liste",
    newRecordTitle: "Nouvelle notice",
    editRecordTitle: "Modifier la notice",
    fieldTitle: "Titre",
    fieldSubtitle: "Sous-titre",
    fieldIsbn: "ISBN / EAN",
    fieldYear: "Année de publication",
    fieldAbstract: "Résumé",
    fieldDocumentType: "Type de document",
    fieldStatus: "Statut de la notice",
    fieldAuthors: "Auteurs",
    fieldPublishers: "Éditeurs",
    fieldSubjects: "Sujets",
    fieldGenres: "Genres",
    hintGenres: "Classent la notice dans les tuiles « Découvrir » de l’accueil du catalogue.",
    hintOnePerLine: "Un par ligne.",
    hintAuthorFormat: "Un par ligne, au format « Nom, Prénom ».",
    optionNone: "—",
    save: "Enregistrer",
    saved: "Notice enregistrée.",
    deleteRecord: "Supprimer la notice",
    copiesTitle: "Exemplaires",
    addCopy: "Ajouter un exemplaire",
    noCopies: "Aucun exemplaire. Ajoutez-en un pour rendre le document empruntable.",
    fieldBarcode: "Code-barres",
    fieldCallNumber: "Cote",
    fieldLocation: "Localisation",
    fieldSection: "Section",
    fieldItemStatus: "Statut",
    saveCopy: "Enregistrer",
    deleteCopy: "Supprimer",
    copySaved: "Exemplaire enregistré.",
    copyDeleted: "Exemplaire supprimé.",
    recordDeleted: "Notice supprimée.",
    onLoanFlag: "Emprunté",
    errTitleRequired: "Le titre est obligatoire.",
    errYearInvalid: "Saisissez une année à quatre chiffres.",
    errHasCopies:
      "Cette notice porte {detail} exemplaire(s). Supprimez-les d’abord.",
    errNotFound: "Cette notice n’existe plus.",
    errBarcodeRequired: "Le code-barres est obligatoire.",
    errBarcodeTaken: "Ce code-barres est déjà utilisé.",
    errOnLoan: "Exemplaire emprunté par {detail} : enregistrez le retour d’abord.",
    assistantTitle: "Assistant de catalogage",
    checkAuthors: "Vérifier les auteurs",
    checkAuthorsHint: "Gratuit : cherche l’ISBN dans Open Library et les auteurs déjà au catalogue.",
    checking: "Vérification…",
    suggestedAuthors: "Auteurs trouvés pour cet ISBN :",
    useSuggested: "Utiliser ces auteurs",
    nothingToCheck: "Saisissez un auteur ou un ISBN, puis vérifiez.",
    matchIdentifier: "Même auteur (identifiant Open Library)",
    matchName: "Même nom",
    matchSurname: "Même nom de famille",
    titlesInCdi: "{count} livre(s) au CDI",
    hasBiography: "biographie ✓",
    noBiography: "sans biographie",
    thisIsThem: "C’est lui",
    newAuthor: "Nouvel auteur",
    noCandidate: "Pas encore au catalogue : un nouvel auteur sera créé.",
    proposeBiography: "Proposer une biographie (IA)",
    proposeAbstract: "Proposer un résumé (IA)",
    aiWorking: "Gemini rédige…",
    aiUsage: "IA : {used} / {limit} requêtes aujourd’hui",
    aiCached: "Réponse déjà connue : aucun coût.",
    aiLimit: "Limite du jour atteinte ({limit} requêtes). Réessayez demain.",
    aiFailed: "Gemini n’a pas pu répondre. Réessayez plus tard.",
    aiNotConfigured: "L’assistant IA n’est pas configuré.",
    samePersonYes: "Gemini confirme que c’est bien cet auteur.",
    samePersonNo: "Gemini pense que ce n’est PAS cet auteur : n’utilisez pas ce texte.",
    samePersonUnsure: "Gemini n’est pas sûr de l’identité : vérifiez avant d’utiliser.",
    biographyDraft: "Biographie proposée (modifiable)",
    datesLabel: "Dates",
    sources: "Sources",
    keepBiography: "Garder cette biographie",
    discard: "Ignorer",
    biographyKept: "Gardée : elle sera enregistrée avec la notice.",
    abstractUnknown: "Gemini ne connaît pas ce livre : rédigez le résumé vous-même.",
    abstractReplace: "Remplacer le résumé déjà saisi ?",
    abstractFilled: "Résumé proposé : relisez-le avant d’enregistrer.",
    reviewNote: "Relisez toujours : rien n’est publié avant votre enregistrement.",
  },
  readers: {
    navReaders: "Lecteurs",
    title: "Nouveau lecteur",
    intro:
      "Inscrivez un lecteur, ou importez une classe entière depuis un fichier.",
    formTitle: "Inscription individuelle",
    formIntro: "L’adresse électronique de l’établissement identifie le lecteur.",
    fieldEmail: "Adresse électronique",
    fieldEmailHint: "Sert d’identifiant de connexion à l’OPAC.",
    fieldLastName: "Nom",
    fieldFirstName: "Prénom",
    fieldBarcode: "Numéro de carte",
    fieldBarcodeHint: "Laissez vide pour une attribution automatique.",
    fieldLogin: "Identifiant OPAC",
    fieldLoginHint: "Par défaut, l’adresse électronique.",
    fieldGender: "Sexe",
    genderFemale: "Féminin",
    genderMale: "Masculin",
    fieldClass: "Classe",
    fieldCategory: "Catégorie",
    fieldStatus: "Statut",
    fieldEnrolledOn: "Début d’adhésion",
    fieldExpiresOn: "Fin d’adhésion",
    fieldNotes: "Message",
    optionNone: "—",
    schoolYearHint: "Pré-rempli sur l’année scolaire {label}.",
    create: "Inscrire le lecteur",
    created: "{name} inscrit(e). Numéro de carte : {barcode}.",
    noPasswordNotice:
      "Aucun mot de passe n’est défini : le lecteur peut emprunter au CDI, mais ne pourra se connecter à l’OPAC qu’une fois un mot de passe attribué.",
    errRequired: "Ce champ est obligatoire.",
    errEmailInvalid: "Adresse électronique invalide.",
    errEmailTaken: "Cette adresse est déjà utilisée par un autre lecteur.",
    errBarcodeTaken: "Ce numéro de carte est déjà utilisé.",
    errLoginTaken: "Cet identifiant est déjà utilisé.",
    errDateInvalid: "Date invalide (JJ/MM/AAAA).",
    errDateOrder: "La fin d’adhésion précède le début.",
    errClassUnknown: "Classe inconnue.",
    importTitle: "Import d’une classe",
    importIntro:
      "Complétez le modèle, puis importez-le. Rien n’est enregistré avant votre confirmation.",
    downloadTemplate: "Télécharger le modèle",
    fileLabel: "Fichier CSV",
    fileHint: "Séparateur virgule ou point-virgule. L’adresse est obligatoire.",
    analyse: "Analyser le fichier",
    previewSummary: "{valid} ligne(s) à importer, {rejected} rejetée(s).",
    colLine: "Ligne",
    colEmail: "Adresse",
    colName: "Nom",
    colClass: "Classe",
    colBarcode: "Carte",
    colProblem: "Problème",
    barcodeAuto: "auto",
    confirmImport: "Importer les lignes valides",
    cancelImport: "Annuler",
    imported: "{count} lecteur(s) importé(s).",
    importedWithRejects:
      "{count} lecteur(s) importé(s). Les lignes rejetées sont listées ci-dessous.",
    downloadRejects: "Télécharger les lignes rejetées",
    errFileEmpty: "Fichier vide ou illisible.",
    errNoEmailColumn: "Colonne « email » absente du fichier.",
    errNoValidRows: "Aucune ligne valide : rien n’a été importé.",
    errDuplicateInFile: "Adresse en double dans le fichier.",
    errUnknownValue: "Valeur inconnue.",
  },
  staff: {
    navStaff: "Personnel",
    title: "Personnel",
    intro: "Qui a le droit de faire quoi dans la gestion.",
    colUser: "Compte",
    colRoles: "Rôles",
    colPermissions: "Droits accordés",
    save: "Enregistrer",
    noPermissions: "Aucun droit — ce compte peut se connecter mais rien faire.",
    inactive: "désactivé",
    rolesTitle: "Rôles disponibles",
    rolesIntro: "Un rôle est un ensemble de droits. Modifiable dans lib/roles.ts.",
    saved: "Rôles de {name} enregistrés.",
    errNotFound: "Compte introuvable.",
    errLastAdmin:
      "Impossible : plus personne ne pourrait gérer les comptes. Donnez d’abord ce rôle à quelqu’un d’autre.",
  },
  holds: {
    navHolds: "Réservations",
    title: "Réservations",
    intro: "Réservations en cours, dépassées, et documents à ranger.",
    tabCurrent: "En cours",
    tabOutdated: "Dépassées",
    tabReshelving: "Documents à ranger",
    noCurrent: "Aucune réservation en cours.",
    noOutdated: "Aucune réservation dépassée.",
    noReshelving: "Aucun document à ranger.",
    colReader: "Lecteur",
    colDocument: "Document",
    colPlacedAt: "Réservé le",
    colUntil: "Échéance",
    colCopy: "Exemplaire",
    colLocation: "Localisation",
    colActions: "Actions",
    waitingForCopy: "En attente d’un exemplaire",
    keptUntil: "Mis de côté jusqu’au {date}",
    lateBy: "Dépassée de {count} j",
    onLoanFlag: "Exemplaire emprunté",
    newTitle: "Nouvelle réservation",
    newIntro: "Le document est réservé au titre, pas à l’exemplaire scanné.",
    fieldReaderCard: "Numéro de carte du lecteur",
    fieldDocumentBarcode: "Code-barres du document",
    place: "Réserver",
    assignTitle: "Affecter un exemplaire",
    assign: "Affecter",
    cancel: "Supprimer",
    lend: "Prêter",
    reshelvingTitle: "Ranger un document",
    reshelvingIntro:
      "Scannez le code-barres du document remis en rayon pour le retirer de la liste.",
    clear: "Retirer de la liste",
    placed: "« {title} » réservé.",
    assigned: "Exemplaire {barcode} affecté à cette réservation.",
    cancelled: "Réservation supprimée.",
    lent: "« {title} » prêté au réservataire.",
    cleared: "{barcode} retiré de la liste.",
    errHoldNotFound: "Cette réservation n’est plus active.",
    errPatronNotFound: "Lecteur introuvable.",
    errItemNotFound: "Aucun exemplaire avec ce code-barres.",
    errRecordNotFound: "Cet exemplaire n’est rattaché à aucune notice.",
    errPatronNotAllowed: "Le statut de ce lecteur n’autorise pas la réservation.",
    errAlreadyHeld: "Ce lecteur a déjà réservé ce document.",
    errItemOnLoan: "Cet exemplaire est déjà emprunté.",
    errItemWrongTitle:
      "L’exemplaire {barcode} appartient à un autre document que celui réservé.",
    errItemAlreadySetAside:
      "L’exemplaire {barcode} est déjà mis de côté pour un autre lecteur.",
    errNoCopyAssigned: "Affectez d’abord un exemplaire à cette réservation.",
  },
  brandTagline: "Portail documentaire du CDI.",
  signInTitle: "Connexion au CDI",
  signInChoice: "Je me connecte en tant que",
  google: {
    signIn: "Se connecter avec Google",
    signedIn: "Connexion réussie — retour à Shelf Library…",
    errors: {
      cancelled: "Connexion Google annulée.",
      invalid: "La connexion Google n’a pas abouti. Réessayez.",
      domain:
        "Seuls les comptes de l’école, en @efbujumbura.com, sont acceptés. Choisissez votre compte de l’école.",
      "no-account":
        "Aucun compte lecteur n’est associé à cette adresse. Adressez-vous au CDI.",
      unavailable:
        "La connexion Google est indisponible pour le moment. Réessayez plus tard ou adressez-vous au CDI.",
    },
  },
  accessDeniedTitle: "Accès refusé",
  accessDeniedHint:
    "Votre compte n’a pas le droit d’accéder à cette page. Contactez la personne qui gère les comptes du CDI.",
  expandSection: "Déplier {section}",
  collapseSection: "Replier {section}",
  portals: {
    gestion: {
      name: "Gestion",
      subtitle: "Administration",
      audience: "Administrateur ou gestionnaire",
      signInHint: "Connectez-vous avec votre identifiant Shelf Library",
      identifierLabel: "Identifiant",
      identifierPlaceholder: "Saisissez votre identifiant",
    },
    opac: {
      name: "OPAC",
      subtitle: "Catalogue public",
      audience: "Élève ou enseignant",
      signInHint: "Connectez-vous avec votre compte efbujumbura.com",
    },
  },
  password: "Mot de passe",
  passwordPlaceholder: "Saisissez votre mot de passe",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  forgotPassword: "Mot de passe oublié ?",
  signIn: "Se connecter",
  skipToContent: "Aller au contenu",
  home: "Accueil",
  quotes: [
    {
      text: "La lecture de tous les bons livres est comme une conversation avec les plus honnêtes gens des siècles passés.",
      author: "René Descartes",
    },
    {
      text: "Je n’ai jamais eu de chagrin qu’une heure de lecture ne m’ait ôté.",
      author: "Montesquieu",
    },
    {
      text: "Chaque lecteur est, quand il lit, le propre lecteur de soi-même.",
      author: "Marcel Proust",
    },
    {
      text: "Je m’étais toujours figuré le paradis sous l’espèce d’une bibliothèque.",
      author: "Jorge Luis Borges",
    },
    {
      text: "La lecture est à l’esprit ce que l’exercice est au corps.",
      author: "Joseph Addison",
    },
    { text: "Un lecteur vit mille vies avant de mourir.", author: "George R. R. Martin" },
  ],
  signingIn: "Connexion…",
  noAccount: "Pas encore de compte ? Contactez le responsable du CDI.",
  forgotTitle: "Mot de passe oublié",
  forgotGestion:
    "Contactez l’administrateur de Shelf Library pour réinitialiser votre mot de passe.",
  backToSignIn: "Retour à la connexion",
  greetingFirst: "Bienvenue, {name}",
  greetingReturning: "Bon retour, {name}",
  signedInAs: "Connecté en tant que",
  signOut: "Se déconnecter",
  themeLabel: "Thème",
  themeDark: "Sombre",
  themeLight: "Clair",
  toLight: "Passer en mode clair",
  toDark: "Passer en mode sombre",
  languageLabel: "Langue",
  identifierRequired: "{label} requis.",
  passwordRequired: "Mot de passe requis.",
  badCredentials: "Identifiant ou mot de passe incorrect.",
  backendUnavailable:
    "Service indisponible pour le moment. Réessayez dans un instant.",
};

const en: Messages = {
  catalogue: {
    title: "Catalogue",
    intro: "Search for books, authors, subjects and more.",
    searchLabel: "Search the catalogue",
    searchPlaceholder: "Search a book, an author, a subject…",
    searchAction: "Search",
    resultsCount: "{count} result(s)",
    resultsFor: "for “{query}”",
    browsingAll: "Whole catalogue",
    noResults: "No results",
    noResultsHint:
      "Check the spelling, use fewer words, or try a broader term.",
    available: "{count} available",
    allOnLoan: "All on loan",
    noHoldings: "No copies",
    copies: "{count} cop(ies)",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {page} of {pageCount}",
    backToResults: "Back to the catalogue",
    authors: "Author(s)",
    publisher: "Publisher",
    year: "Year",
    isbn: "ISBN",
    subjects: "Subjects",
    collection: "Collection",
    series: "Series",
    classification: "Classification",
    abstract: "Abstract",
    documentType: "Document type",
    holdings: "Copies",
    barcode: "Barcode",
    callNumber: "Call number",
    location: "Location",
    section: "Section",
    itemStatus: "Status",
    onLoanUntil: "On loan until {date}",
    onShelf: "On shelf",
    notFound: "Record not found",
    notFoundHint: "This record does not exist or is not published to the catalogue.",
    myAccount: "My account",
    welcomeTitle: "Welcome to the library",
    welcomeSchool: "École Française de Bujumbura",
    newArrivals: "New arrivals",
    seeMore: "See more",
    scrollBack: "Previous new arrivals",
    scrollForward: "More new arrivals",
    searchPanelTitle: "Find a document",
    searchTipsTitle: "Tips",
    searching: "Searching…",
    seeAllResults: "See all {count} results",
    searchTips: [
      "Mix title and author: “camus peste” works.",
      "Accents are optional: “etranger” finds “L’Étranger”.",
      "The start of a word is enough: “biblio” finds “bibliothèque”.",
    ],
    discover: "Discover",
    dockLabel: "Explore the catalogue",
    practicalTitle: "Practical information",
    hoursTitle: "Opening hours",
    borrowTitle: "Borrow",
    borrowText: "Up to {days} days per item.",
    renewTitle: "Renew",
    renewText: "Up to {count} times, online from",
    returnTitle: "Return",
    returnText: "At the library desk.",
    placeTitle: "Find us",
    emailTitle: "Email the library",
    phoneTitle: "Phone",
    closePanel: "Close",
    genres: "Genre(s)",
    resultsTitle: "Search results",
    resultsRange: "Results {from} to {to} of {total}",
    filterTitle: "Refine your search",
    filterFormat: "Format",
    filterGenre: "Genre",
    filterLanguage: "Language",
    filtersButton: "Filters ({count})",
    clearFilters: "Clear filters",
    removeFilter: "Remove the “{label}” filter",
    viewLabel: "View",
    viewList: "List",
    viewDetailed: "Detailed",
    sortLabel: "Sort by",
    sortApply: "Sort",
    sorts: {
      pertinence: "Relevance",
      titre: "Title (A → Z)",
      auteur: "Author (A → Z)",
      recent: "Newest",
      annee: "Publication year",
    },
    locate: "Find it on the shelf",
    language: "Language",
    paginationLabel: "Result pages",
    paginationEndLabel: "Result pages, end of list",
    pageLink: "Page {page}",
    locateBook: "Locate the book",
    reserveBook: "Reserve this book",
    copiesTitle: "Copies of “{title}”",
    copiesFound: "{count} cop(ies) found.",
    copiesHint: "Note the call number: it tells you which shelf the book is on. The library team can help you find it.",
    colCopy: "Copy number",
    colPlace: "Location",
    colAvailability: "Availability",
    colAcquired: "Acquired",
    copyAvailable: "Available",
    reserveTitle: "Reserve “{title}”",
    reserveIntro: "The library will set a copy aside for you as soon as one is free. You will then have {days} days to collect it.",
    reserveConfirm: "Confirm the reservation",
    cancel: "Cancel",
    reserveOk: "Done: “{title}” is reserved for you. Your reservations are in My account.",
    reserveErrors: {
      PATRON_NOT_ALLOWED: "Your account cannot place reservations. Please ask the library team.",
      RECORD_NOT_FOUND: "This book is no longer in the catalogue.",
      NO_LOANABLE_COPY: "This item cannot be borrowed: it is for reading in the library.",
      ALREADY_HELD: "You have already reserved this book.",
      ALREADY_ON_LOAN: "You already have this book on loan.",
    },
    like: "Like",
    unlike: "Unlike",
    likeCount: "{count} like(s)",
    recommend: "Recommend",
    linkCopied: "Link copied",
    shareText: "I recommend “{title}”, at the École Française de Bujumbura library.",
    authorBooks: "{name}’s books in the library",
    noBiography: "The library has not written a biography for this author yet.",
    noPublisherDescription: "The library has not written a description for this publisher yet.",
    authorWebsite: "Website",
    favoritesTitle: "My favourites",
    noFavorites: "No favourites yet. Tap the heart under a book to keep it here.",
    holdsTitle: "My reservations",
    noHolds: "No reservations at the moment.",
    colPlacedOn: "Reserved on",
    holdWaiting: "Waiting for a copy",
    holdReady: "Collect from the library by {date}",
    collation: "Collation",
    ean: "EAN",
    publishedIn: "Published in {year}",
    edition: "Edition",
    dimensions: "Size",
    breadcrumbLabel: "You are here",
    home: "Home",
    catalogueCrumb: "Catalogue",
    details: "Details",
    signInReserveTitle: "Sign in to reserve this book",
    signInLikeTitle: "Sign in to like this book",
    signInSchoolHint: "Use your school Google account (an @efbujumbura.com address).",
    moreInfo: "More about this book",
    authorLoading: "Loading…",
    authorBooksShort: "Their books in the library",
    authorAllBooks: "See all their books ({count})",
  },
  circulation: {
    navDashboard: "Dashboard",
    navCirculation: "Circulation",
    navCatalogue: "Catalogue",
    dashboardTitle: "Hello, {name}",
    dashboardIntro: "Here is your library at a glance today.",
    statRecords: "Records",
    statItems: "Copies",
    statPatrons: "Patrons",
    statActiveLoans: "Loans out",
    statOverdue: "Overdue",
    recentLoans: "Recent loans",
    noRecentLoans: "Nothing is currently on loan.",
    colMember: "Patron",
    colDocument: "Document",
    colLoanedOn: "Loaned",
    colDueOn: "Due",
    colStatus: "Status",
    statusOnLoan: "On loan",
    statusLate: "{count} days late",
    deskTitle: "Circulation",
    deskIntro: "Check out and check in. Scan or type a barcode.",
    patronLabel: "Patron card number",
    patronPlaceholder: "E-2026-0001",
    patronFind: "Open patron",
    patronNotFound: "No patron with that card number.",
    patronChange: "Change patron",
    patronCategoryLabel: "Category",
    patronMembershipLabel: "Membership",
    patronExpiresOn: "Membership until {date}",
    patronNoExpiry: "Membership has no end date",
    patronQuota: "{used} of {quota} loans",
    patronQuotaNone: "{used} loan(s), no quota",
    checkOutTitle: "Check out",
    checkOutIntro: "The copy is lent to the patron opened above.",
    itemLabel: "Copy barcode",
    itemPlaceholder: "CDI-000001",
    checkOutAction: "Check out",
    checkOutAnyway: "Check out anyway",
    checkInTitle: "Check in",
    checkInIntro: "No patron is needed to record a return.",
    checkInAction: "Check in",
    loansTitle: "Loans out",
    noLoans: "Nothing on loan.",
    renewAction: "Renew",
    renewAnyway: "Renew anyway",
    returnAction: "Return",
    colRenewals: "Renewals",
    dueOnDate: "Until {date}",
    checkOutOk: "“{title}” checked out until {date}.",
    checkInOk: "“{title}” returned by {name}.",
    checkInLate: "“{title}” returned {count} day(s) late.",
    renewOk: "“{title}” renewed until {date}.",
    errPatronNotFound: "Patron not found.",
    errItemNotFound: "No copy with that barcode.",
    errPatronExpired: "This patron's membership has expired.",
    errPatronBlocked: "This patron is suspended.",
    errPatronNotAllowed: "This patron's status does not allow borrowing.",
    errItemNotLoanable: "Copy is not for loan ({detail}).",
    errAlreadyOnLoanHere: "This patron already has this copy.",
    errAlreadyOnLoanElsewhere: "This copy is already on loan to {detail}.",
    errQuotaReached: "Loan quota reached ({detail} loans).",
    errForbidden: "Your account is not allowed to perform this action.",
    errNotOnLoan: "“{detail}” was not on loan.",
    errLoanNotFound: "That loan is no longer open.",
    errRenewNotAllowed: "This patron's status does not allow renewals.",
    errRenewLimit: "Renewal limit reached.",
    errRenewNoLaterDate: "Renewing would run past the end of the membership.",
    accountTitle: "My loans",
    accountCurrent: "On loan",
    accountHistory: "History",
    accountNoCurrent: "You have nothing on loan.",
    accountNoHistory: "Nothing returned yet.",
    accountReturnedOn: "Returned {date}",
    accountRenewHint:
      "You can renew a loan twice, unless it would run past the end of your membership.",
  },
  cataloguing: {
    navCataloguing: "Cataloguing",
    listTitle: "Cataloguing",
    listIntro: "Create and edit records and their copies.",
    searchPlaceholder: "Title, author or ISBN…",
    searchAction: "Search",
    newRecord: "New record",
    colTitle: "Title",
    colAuthors: "Author(s)",
    colType: "Type",
    colStatus: "Status",
    colCopies: "Copies",
    noRecords: "No records.",
    edit: "Edit",
    backToList: "Back to the list",
    newRecordTitle: "New record",
    editRecordTitle: "Edit record",
    fieldTitle: "Title",
    fieldSubtitle: "Subtitle",
    fieldIsbn: "ISBN / EAN",
    fieldYear: "Year of publication",
    fieldAbstract: "Abstract",
    fieldDocumentType: "Document type",
    fieldStatus: "Record status",
    fieldAuthors: "Authors",
    fieldPublishers: "Publishers",
    fieldSubjects: "Subjects",
    fieldGenres: "Genres",
    hintGenres: "Files the record under the “Discover” tiles on the catalogue home.",
    hintOnePerLine: "One per line.",
    hintAuthorFormat: "One per line, as “Surname, Forename”.",
    optionNone: "—",
    save: "Save",
    saved: "Record saved.",
    deleteRecord: "Delete record",
    copiesTitle: "Copies",
    addCopy: "Add a copy",
    noCopies: "No copies. Add one to make the document borrowable.",
    fieldBarcode: "Barcode",
    fieldCallNumber: "Call number",
    fieldLocation: "Location",
    fieldSection: "Section",
    fieldItemStatus: "Status",
    saveCopy: "Save",
    deleteCopy: "Delete",
    copySaved: "Copy saved.",
    copyDeleted: "Copy deleted.",
    recordDeleted: "Record deleted.",
    onLoanFlag: "On loan",
    errTitleRequired: "A title is required.",
    errYearInvalid: "Enter a four-digit year.",
    errHasCopies: "This record has {detail} copies. Delete those first.",
    errNotFound: "This record no longer exists.",
    errBarcodeRequired: "A barcode is required.",
    errBarcodeTaken: "That barcode is already in use.",
    errOnLoan: "On loan to {detail}: check it in first.",
    assistantTitle: "Cataloguing assistant",
    checkAuthors: "Check the authors",
    checkAuthorsHint: "Free: looks the ISBN up in Open Library and the authors up in the catalogue.",
    checking: "Checking…",
    suggestedAuthors: "Authors found for this ISBN:",
    useSuggested: "Use these authors",
    nothingToCheck: "Type an author or an ISBN, then check.",
    matchIdentifier: "Same author (Open Library identifier)",
    matchName: "Same name",
    matchSurname: "Same surname",
    titlesInCdi: "{count} book(s) in the library",
    hasBiography: "biography ✓",
    noBiography: "no biography",
    thisIsThem: "That’s them",
    newAuthor: "New author",
    noCandidate: "Not in the catalogue yet: a new author will be created.",
    proposeBiography: "Suggest a biography (AI)",
    proposeAbstract: "Suggest a summary (AI)",
    aiWorking: "Gemini is writing…",
    aiUsage: "AI: {used} / {limit} requests today",
    aiCached: "Answer already known: no cost.",
    aiLimit: "Today’s limit reached ({limit} requests). Try again tomorrow.",
    aiFailed: "Gemini could not answer. Try again later.",
    aiNotConfigured: "The AI assistant is not configured.",
    samePersonYes: "Gemini confirms it is this author.",
    samePersonNo: "Gemini thinks this is NOT this author: do not use this text.",
    samePersonUnsure: "Gemini is not sure who this is: check before using it.",
    biographyDraft: "Suggested biography (editable)",
    datesLabel: "Dates",
    sources: "Sources",
    keepBiography: "Keep this biography",
    discard: "Discard",
    biographyKept: "Kept: it will be saved with the record.",
    abstractUnknown: "Gemini does not know this book: please write the summary yourself.",
    abstractReplace: "Replace the summary already typed?",
    abstractFilled: "Summary suggested: read it through before saving.",
    reviewNote: "Always read it through: nothing is published until you save.",
  },
  readers: {
    navReaders: "Readers",
    title: "New reader",
    intro: "Enrol one reader, or import a whole class from a file.",
    formTitle: "Single enrolment",
    formIntro: "The school email address identifies the reader.",
    fieldEmail: "Email address",
    fieldEmailHint: "Used as the OPAC sign-in name.",
    fieldLastName: "Surname",
    fieldFirstName: "First name",
    fieldBarcode: "Card number",
    fieldBarcodeHint: "Leave blank to generate one.",
    fieldLogin: "OPAC login",
    fieldLoginHint: "Defaults to the email address.",
    fieldGender: "Gender",
    genderFemale: "Female",
    genderMale: "Male",
    fieldClass: "Class",
    fieldCategory: "Category",
    fieldStatus: "Status",
    fieldEnrolledOn: "Membership starts",
    fieldExpiresOn: "Membership ends",
    fieldNotes: "Note",
    optionNone: "—",
    schoolYearHint: "Pre-filled for the {label} school year.",
    create: "Enrol reader",
    created: "{name} enrolled. Card number: {barcode}.",
    noPasswordNotice:
      "No password is set: the reader can borrow at the desk, but cannot sign into the catalogue until one is given.",
    errRequired: "This field is required.",
    errEmailInvalid: "Invalid email address.",
    errEmailTaken: "Another reader already uses this address.",
    errBarcodeTaken: "That card number is already in use.",
    errLoginTaken: "That login is already in use.",
    errDateInvalid: "Invalid date (DD/MM/YYYY).",
    errDateOrder: "Membership ends before it starts.",
    errClassUnknown: "Unknown class.",
    importTitle: "Import a class",
    importIntro:
      "Fill in the template, then import it. Nothing is saved until you confirm.",
    downloadTemplate: "Download the template",
    fileLabel: "CSV file",
    fileHint: "Comma or semicolon separated. Email is mandatory.",
    analyse: "Analyse the file",
    previewSummary: "{valid} row(s) to import, {rejected} rejected.",
    colLine: "Line",
    colEmail: "Email",
    colName: "Name",
    colClass: "Class",
    colBarcode: "Card",
    colProblem: "Problem",
    barcodeAuto: "auto",
    confirmImport: "Import the valid rows",
    cancelImport: "Cancel",
    imported: "{count} reader(s) imported.",
    importedWithRejects:
      "{count} reader(s) imported. The rejected rows are listed below.",
    downloadRejects: "Download the rejected rows",
    errFileEmpty: "Empty or unreadable file.",
    errNoEmailColumn: "The file has no “email” column.",
    errNoValidRows: "No valid rows: nothing was imported.",
    errDuplicateInFile: "Duplicate address within the file.",
    errUnknownValue: "Unknown value.",
  },
  staff: {
    navStaff: "Staff",
    title: "Staff",
    intro: "Who is allowed to do what in the back office.",
    colUser: "Account",
    colRoles: "Roles",
    colPermissions: "Granted",
    save: "Save",
    noPermissions: "No rights — this account can sign in but do nothing.",
    inactive: "disabled",
    rolesTitle: "Available roles",
    rolesIntro: "A role is a set of rights. Edit them in lib/roles.ts.",
    saved: "Roles saved for {name}.",
    errNotFound: "Account not found.",
    errLastAdmin:
      "Refused: nobody would be left able to manage accounts. Give this role to someone else first.",
  },
  holds: {
    navHolds: "Reservations",
    title: "Reservations",
    intro: "Current and overdue reservations, and items to reshelve.",
    tabCurrent: "Current",
    tabOutdated: "Overdue",
    tabReshelving: "To reshelve",
    noCurrent: "No current reservations.",
    noOutdated: "No overdue reservations.",
    noReshelving: "Nothing to reshelve.",
    colReader: "Reader",
    colDocument: "Document",
    colPlacedAt: "Placed",
    colUntil: "Until",
    colCopy: "Copy",
    colLocation: "Location",
    colActions: "Actions",
    waitingForCopy: "Waiting for a copy",
    keptUntil: "Held until {date}",
    lateBy: "{count} days overdue",
    onLoanFlag: "Copy is on loan",
    newTitle: "New reservation",
    newIntro: "The title is reserved, not the copy you scan.",
    fieldReaderCard: "Reader card number",
    fieldDocumentBarcode: "Copy barcode",
    place: "Reserve",
    assignTitle: "Assign a copy",
    assign: "Assign",
    cancel: "Delete",
    lend: "Check out",
    reshelvingTitle: "Reshelve an item",
    reshelvingIntro:
      "Scan the barcode of the item you have put back to clear it from the list.",
    clear: "Clear",
    placed: "“{title}” reserved.",
    assigned: "Copy {barcode} assigned to this reservation.",
    cancelled: "Reservation deleted.",
    lent: "“{title}” checked out to the reader who reserved it.",
    cleared: "{barcode} cleared from the list.",
    errHoldNotFound: "That reservation is no longer active.",
    errPatronNotFound: "Reader not found.",
    errItemNotFound: "No copy with that barcode.",
    errRecordNotFound: "That copy is not attached to any record.",
    errPatronNotAllowed: "This reader's status does not allow reservations.",
    errAlreadyHeld: "This reader has already reserved this document.",
    errItemOnLoan: "That copy is already on loan.",
    errItemWrongTitle: "Copy {barcode} belongs to a different document.",
    errItemAlreadySetAside:
      "Copy {barcode} is already set aside for another reader.",
    errNoCopyAssigned: "Assign a copy to this reservation first.",
  },
  brandTagline: "Library resource centre portal.",
  signInTitle: "Sign in to the library",
  signInChoice: "I am signing in as",
  google: {
    signIn: "Sign in with Google",
    signedIn: "Signed in — returning to Shelf Library…",
    errors: {
      cancelled: "Google sign-in was cancelled.",
      invalid: "Google sign-in did not complete. Please try again.",
      domain:
        "Only school accounts ending in @efbujumbura.com are accepted. Please choose your school account.",
      "no-account": "No reader account is linked to this address. Please ask at the library.",
      unavailable: "Google sign-in is unavailable right now. Please try again later or ask at the library.",
    },
  },
  accessDeniedTitle: "Access denied",
  accessDeniedHint:
    "Your account is not allowed to open this page. Ask whoever manages accounts for the library.",
  expandSection: "Expand {section}",
  collapseSection: "Collapse {section}",
  portals: {
    gestion: {
      name: "Gestion",
      subtitle: "Administration",
      audience: "Administrator or manager",
      signInHint: "Sign in with your Shelf Library username",
      identifierLabel: "Username",
      identifierPlaceholder: "Enter your username",
    },
    opac: {
      name: "OPAC",
      subtitle: "Public catalogue",
      audience: "Student or teacher",
      signInHint: "Sign in with your efbujumbura.com account",
    },
  },
  password: "Password",
  passwordPlaceholder: "Enter your password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  forgotPassword: "Forgot password?",
  signIn: "Sign in",
  skipToContent: "Skip to content",
  home: "Home",
  quotes: [
    {
      text: "The reading of all good books is like a conversation with the finest minds of past centuries.",
      author: "René Descartes",
    },
    { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
    { text: "A reader lives a thousand lives before he dies.", author: "George R. R. Martin" },
    {
      text: "I have always imagined that Paradise will be a kind of library.",
      author: "Jorge Luis Borges",
    },
    {
      text: "The more that you read, the more things you will know.",
      author: "Dr. Seuss",
    },
    { text: "So many books, so little time.", author: "Frank Zappa" },
  ],
  signingIn: "Signing in…",
  noAccount: "Don’t have an account? Contact the library staff.",
  forgotTitle: "Forgot password",
  forgotGestion:
    "Contact your Shelf Library administrator to reset your password.",
  backToSignIn: "Back to sign in",
  greetingFirst: "Welcome, {name}",
  greetingReturning: "Welcome back, {name}",
  signedInAs: "Signed in as",
  signOut: "Sign out",
  themeLabel: "Theme",
  themeDark: "Dark",
  themeLight: "Light",
  toLight: "Switch to light mode",
  toDark: "Switch to dark mode",
  languageLabel: "Language",
  identifierRequired: "{label} is required.",
  passwordRequired: "Password is required.",
  badCredentials: "Incorrect username or password.",
  backendUnavailable: "Service unavailable right now. Please try again shortly.",
};

const DICTIONARIES: Record<Locale, Messages> = { fr, en };

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

/** Substitutes {placeholders} in a message. */
export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

export type { Messages };
