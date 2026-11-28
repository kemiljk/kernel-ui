// The consumer's bundler replaces `process.env.NODE_ENV` (React's own checks
// rely on the same thing), so source can read it without depending on
// @types/node. Only used to gate development-only code; see
// utils/warnDeprecated.ts.
declare const process: { readonly env: { readonly NODE_ENV?: string } };
