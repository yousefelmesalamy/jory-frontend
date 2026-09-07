/**
 * A client-side mirror of the four validators Django is configured with in
 * `Jory/settings.py` (`AUTH_PASSWORD_VALIDATORS`), so the register form can
 * show, live, the same verdict the server will reach on submit.
 *
 * The server stays the authority — this only saves the shopper a round trip.
 * `common` is the honest weak spot: Django checks a 20k-word list, we check the
 * handful below, so a password can pass here and still be rejected there.
 */
export type PasswordRuleId = 'length' | 'numeric' | 'common' | 'similar';

export interface PasswordRuleState {
  readonly id: PasswordRuleId;
  readonly met: boolean;
}

/** Django's `MinimumLengthValidator` default. */
const MIN_LENGTH = 8;

/** The most-used entries of Django's bundled `common-passwords.txt.gz`. */
const COMMON = new Set([
  '123456789',
  '12345678',
  'password',
  'qwerty123',
  'password1',
  'iloveyou',
  'princess',
  '1234567890',
  'football',
  'baseball',
  'sunshine',
  'welcome1',
  'passw0rd',
  'trustno1',
  'superman',
  'qwertyuiop',
  'starwars',
  'whatever',
  'jennifer',
  'michelle',
  'computer',
  'butterfly',
  'password123',
  'letmein1',
]);

/**
 * Django's `UserAttributeSimilarityValidator` uses a difflib ratio; we use
 * containment either way round, which catches the cases shoppers actually hit
 * (password *is* the username, or the email's local part) without shipping a
 * sequence matcher.
 */
function isSimilarTo(password: string, attribute: string): boolean {
  const a = password.trim().toLowerCase();
  const b = attribute.trim().toLowerCase();

  if (a.length === 0 || b.length < 3) {
    return false;
  }

  return a.includes(b) || b.includes(a);
}

/** The attributes Django compares a password against, plus the email's local part. */
export interface PasswordContext {
  readonly email?: string;
  readonly username?: string;
  readonly fullName?: string;
}

export function evaluatePassword(
  password: string,
  context: PasswordContext = {},
): PasswordRuleState[] {
  const attributes = [
    context.email ?? '',
    (context.email ?? '').split('@')[0],
    context.username ?? '',
    context.fullName ?? '',
  ].filter((value) => value.length > 0);

  return [
    { id: 'length', met: password.length >= MIN_LENGTH },
    { id: 'numeric', met: password.length > 0 && !/^\d+$/.test(password) },
    { id: 'common', met: password.length > 0 && !COMMON.has(password.toLowerCase()) },
    {
      id: 'similar',
      met: password.length > 0 && !attributes.some((value) => isSimilarTo(password, value)),
    },
  ];
}

/**
 * 0–4, for the meter. The four rules carry it; the last step also asks for some
 * variety, so a long lowercase-only password reads as "good" rather than "strong".
 */
export function passwordScore(rules: readonly PasswordRuleState[], password: string): number {
  const met = rules.filter((rule) => rule.met).length;
  if (met < rules.length) {
    return met === 0 ? 0 : Math.min(met, 2);
  }

  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));

  return variety >= 3 && password.length >= 12 ? 4 : 3;
}

/** Django's `UsernameValidator` character set, plus a floor on length. */
export const USERNAME_PATTERN = /^[\w.@+-]+$/;
export const USERNAME_MIN_LENGTH = 3;
