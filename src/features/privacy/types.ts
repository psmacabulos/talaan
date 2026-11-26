/**
 * A school's privacy notice (Step 60.4): one published version of it. A
 * version is never changed once published; publishing again adds the next.
 */
export type PrivacyNotice = {
  schoolId: string;
  version: number;
  body: string;
  publishedAt: string;
};

/** A version's number and date, without its text: the Settings page's "Earlier versions". */
export type NoticeVersion = { version: number; publishedAt: string };
