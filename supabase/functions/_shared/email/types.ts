export type EmailTemplate =
  | "welcome"
  | "user_added_to_company"
  | "company_invitation"
  | "role_changed"
  | "reward_unlocked"
  | "system_notification";

export type RenderedEmail = { subject: string; html: string; text: string };
export type WelcomeEmailProps = { name: string; appUrl: string };
export type UserAddedToCompanyEmailProps = WelcomeEmailProps & { companyName: string; role: string; actorName?: string };
export type CompanyInvitationEmailProps = { companyName: string; role: string; invitationUrl: string };
export type RoleChangedEmailProps = WelcomeEmailProps & { companyName: string; role: string };
export type RewardUnlockedEmailProps = WelcomeEmailProps & { rewardName: string };
export type SystemNotificationEmailProps = { title: string; message: string; buttonText?: string; buttonUrl?: string };

export type SendEmailInput = {
  to: string;
  template: EmailTemplate;
  eventKey: string;
  rendered: RenderedEmail;
  userId?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; code: "RESEND_NOT_CONFIGURED" | "RESEND_SEND_FAILED" | "INVALID_RECIPIENT"; retryable: boolean };

export type PublishedTemplateVariables = {
  NOME:string; TITULO:string; MENSAGEM:string; CARD_LABEL:string;
  CARD_VALUE:string; BUTTON_TEXT:string; BUTTON_URL:string; ANO:number;
};
