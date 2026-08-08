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

type Messages = {
  catalogue: CatalogueCopy;
  brandTagline: string;
  /** First-ever sign-in on this device. */
  welcome: string;
  /** Every subsequent visit. */
  welcomeBack: string;
  signInSubtitle: string;
  portalNavLabel: string;
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
  brandTagline: "Portail documentaire du CDI.",
  welcome: "Bienvenue",
  welcomeBack: "Bon retour",
  signInSubtitle: "Connectez-vous à votre espace Shelf Library.",
  portalNavLabel: "Choix de l’espace",
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
  brandTagline: "Library resource centre portal.",
  welcome: "Welcome",
  welcomeBack: "Welcome back",
  signInSubtitle: "Sign in to your Shelf Library account.",
  portalNavLabel: "Choose a portal",
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
