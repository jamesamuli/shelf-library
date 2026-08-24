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
  identifierLabel: string;
  identifierPlaceholder: string;
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

type Messages = {
  catalogue: CatalogueCopy;
  circulation: CirculationCopy;
  cataloguing: CataloguingCopy;
  readers: ReadersCopy;
  holds: HoldsCopy;
  brandTagline: string;
  /** First-ever sign-in on this device. */
  welcome: string;
  /** Every subsequent visit. */
  welcomeBack: string;
  signInSubtitle: string;
  portalNavLabel: string;
  /** Both contain a {section} placeholder. */
  expandSection: string;
  collapseSection: string;
  portals: { gestion: PortalCopy; opac: PortalCopy };
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  noAccount: string;
  trust: { title: string; detail: string }[];
  forgotTitle: string;
  forgotGestion: string;
  forgotOpac: string;
  backToSignIn: string;
  /** Both contain a {name} placeholder. */
  greetingFirst: string;
  greetingReturning: string;
  signedInAs: string;
  signOut: string;
  themeLabel: string;
  toLight: string;
  toDark: string;
  languageLabel: string;
  unknownPortal: string;
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
    backToResults: "Retour aux résultats",
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
  welcome: "Bienvenue",
  welcomeBack: "Bon retour",
  signInSubtitle: "Connectez-vous à votre espace Shelf Library.",
  portalNavLabel: "Choix de l’espace",
  expandSection: "Déplier {section}",
  collapseSection: "Replier {section}",
  portals: {
    gestion: {
      name: "Gestion",
      subtitle: "Administration",
      identifierLabel: "Identifiant",
      identifierPlaceholder: "Saisissez votre identifiant",
    },
    opac: {
      name: "OPAC",
      subtitle: "Catalogue public",
      identifierLabel: "Numéro de carte",
      identifierPlaceholder: "Saisissez votre numéro de carte",
    },
  },
  password: "Mot de passe",
  passwordPlaceholder: "Saisissez votre mot de passe",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  forgotPassword: "Mot de passe oublié ?",
  signIn: "Se connecter",
  signingIn: "Connexion…",
  noAccount: "Pas encore de compte ? Contactez le responsable du CDI.",
  trust: [
    { title: "Sécurisé", detail: "Vos données sont protégées" },
    { title: "Fiable", detail: "Conçu pour les bibliothèques" },
    { title: "Open source", detail: "Porté par la communauté" },
  ],
  forgotTitle: "Mot de passe oublié",
  forgotGestion:
    "Contactez l’administrateur de Shelf Library pour réinitialiser votre mot de passe.",
  forgotOpac:
    "Présentez-vous au CDI avec votre carte pour faire réinitialiser votre mot de passe.",
  backToSignIn: "Retour à la connexion",
  greetingFirst: "Bienvenue, {name}",
  greetingReturning: "Bon retour, {name}",
  signedInAs: "Connecté en tant que",
  signOut: "Se déconnecter",
  themeLabel: "Thème",
  toLight: "Passer en mode clair",
  toDark: "Passer en mode sombre",
  languageLabel: "Langue",
  unknownPortal: "Portail inconnu.",
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
    backToResults: "Back to results",
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
  welcome: "Welcome",
  welcomeBack: "Welcome back",
  signInSubtitle: "Sign in to your Shelf Library account.",
  portalNavLabel: "Choose a portal",
  expandSection: "Expand {section}",
  collapseSection: "Collapse {section}",
  portals: {
    gestion: {
      name: "Gestion",
      subtitle: "Administration",
      identifierLabel: "Username",
      identifierPlaceholder: "Enter your username",
    },
    opac: {
      name: "OPAC",
      subtitle: "Public catalogue",
      identifierLabel: "Card number",
      identifierPlaceholder: "Enter your card number",
    },
  },
  password: "Password",
  passwordPlaceholder: "Enter your password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  forgotPassword: "Forgot password?",
  signIn: "Sign in",
  signingIn: "Signing in…",
  noAccount: "Don’t have an account? Contact the library staff.",
  trust: [
    { title: "Secure", detail: "Your data is safe" },
    { title: "Reliable", detail: "Built for libraries" },
    { title: "Open source", detail: "Community driven" },
  ],
  forgotTitle: "Forgot password",
  forgotGestion:
    "Contact your Shelf Library administrator to reset your password.",
  forgotOpac:
    "Bring your card to the library desk to have your password reset.",
  backToSignIn: "Back to sign in",
  greetingFirst: "Welcome, {name}",
  greetingReturning: "Welcome back, {name}",
  signedInAs: "Signed in as",
  signOut: "Sign out",
  themeLabel: "Theme",
  toLight: "Switch to light mode",
  toDark: "Switch to dark mode",
  languageLabel: "Language",
  unknownPortal: "Unknown portal.",
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

export type { Messages, PortalCopy };
