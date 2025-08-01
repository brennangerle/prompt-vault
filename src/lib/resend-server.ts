import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

export async function addUserToResendAudience(email: string, firstName?: string, lastName?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Skipping adding user to audience.');
    return;
  }

  if (!process.env.RESEND_AUDIENCE_ID) {
    console.warn('RESEND_AUDIENCE_ID is not set. Skipping adding user to audience.');
    return;
  }

  try {
    await resend.contacts.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      unsubscribed: false,
      audienceId: process.env.RESEND_AUDIENCE_ID,
    });
    console.log(`Successfully added ${email} to Resend audience.`);
  } catch (error) {
    console.error(`Failed to add user to Resend audience:`, error);
    // Don't throw error to prevent breaking user registration flow
  }
} 