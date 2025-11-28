import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'LoopHub <noreply@loophub.com>';
const APP_NAME = 'LoopHub';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://loophub.com';

export interface DigestEmailData {
  to: string;
  username: string;
  language: string;
  trendingThreads: Array<{
    id: string;
    title: string;
    forumName: string;
    forumSlug: string;
    authorUsername: string;
    upvoteCount: number;
    commentCount: number;
  }>;
  subscriptionThreads: Array<{
    id: string;
    title: string;
    forumName: string;
    forumSlug: string;
    authorUsername: string;
    upvoteCount: number;
  }>;
  activity: {
    threadsCreated: number;
    commentsPosted: number;
    upvotesReceived: number;
    repliesReceived: number;
  };
  unsubscribeUrl: string;
}

// Translations for digest email
const translations = {
  es: {
    subject: '📬 Tu resumen semanal de LoopHub',
    greeting: 'Hola',
    intro: 'Aquí está tu resumen semanal de lo que ha pasado en la comunidad.',
    trendingTitle: '🔥 Trending esta semana',
    subscriptionsTitle: '📌 De tus suscripciones',
    activityTitle: '📊 Tu actividad',
    threadsCreated: 'Hilos creados',
    commentsPosted: 'Comentarios',
    upvotesReceived: 'Votos recibidos',
    repliesReceived: 'Respuestas recibidas',
    noTrending: 'No hay hilos trending esta semana',
    noSubscriptions: 'No hay nuevos hilos en tus suscripciones',
    viewThread: 'Ver hilo',
    viewMore: 'Ver más en LoopHub',
    footer: 'Recibiste este email porque tienes activado el digest semanal.',
    unsubscribe: 'Cancelar suscripción',
    by: 'por',
    in: 'en',
    votes: 'votos',
    comments: 'comentarios',
  },
  en: {
    subject: '📬 Your weekly LoopHub digest',
    greeting: 'Hi',
    intro: "Here's your weekly summary of what happened in the community.",
    trendingTitle: '🔥 Trending this week',
    subscriptionsTitle: '📌 From your subscriptions',
    activityTitle: '📊 Your activity',
    threadsCreated: 'Threads created',
    commentsPosted: 'Comments',
    upvotesReceived: 'Upvotes received',
    repliesReceived: 'Replies received',
    noTrending: 'No trending threads this week',
    noSubscriptions: 'No new threads in your subscriptions',
    viewThread: 'View thread',
    viewMore: 'View more on LoopHub',
    footer: 'You received this email because you have weekly digest enabled.',
    unsubscribe: 'Unsubscribe',
    by: 'by',
    in: 'in',
    votes: 'votes',
    comments: 'comments',
  },
  pt: {
    subject: '📬 Seu resumo semanal do LoopHub',
    greeting: 'Olá',
    intro: 'Aqui está seu resumo semanal do que aconteceu na comunidade.',
    trendingTitle: '🔥 Trending esta semana',
    subscriptionsTitle: '📌 Das suas assinaturas',
    activityTitle: '📊 Sua atividade',
    threadsCreated: 'Tópicos criados',
    commentsPosted: 'Comentários',
    upvotesReceived: 'Votos recebidos',
    repliesReceived: 'Respostas recebidas',
    noTrending: 'Nenhum tópico trending esta semana',
    noSubscriptions: 'Nenhum novo tópico nas suas assinaturas',
    viewThread: 'Ver tópico',
    viewMore: 'Ver mais no LoopHub',
    footer: 'Você recebeu este email porque tem o digest semanal ativado.',
    unsubscribe: 'Cancelar assinatura',
    by: 'por',
    in: 'em',
    votes: 'votos',
    comments: 'comentários',
  },
};

function getTranslations(lang: string) {
  return translations[lang as keyof typeof translations] || translations.es;
}

/**
 * Generate HTML content for the digest email
 */
function generateDigestHtml(data: DigestEmailData): string {
  const t = getTranslations(data.language);
  
  const trendingHtml = data.trendingThreads.length > 0
    ? data.trendingThreads.map(thread => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <a href="${APP_URL}/thread/${thread.id}" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 16px;">
            ${escapeHtml(thread.title)}
          </a>
          <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">
            ${t.by} <strong>${escapeHtml(thread.authorUsername)}</strong> ${t.in} 
            <a href="${APP_URL}/forum/${thread.forumSlug}" style="color: #3b82f6;">${escapeHtml(thread.forumName)}</a>
          </p>
          <p style="margin: 8px 0 0; color: #9ca3af; font-size: 13px;">
            👍 ${thread.upvoteCount} ${t.votes} · 💬 ${thread.commentCount} ${t.comments}
          </p>
        </td>
      </tr>
    `).join('')
    : `<tr><td style="padding: 16px; color: #9ca3af;">${t.noTrending}</td></tr>`;

  const subscriptionsHtml = data.subscriptionThreads.length > 0
    ? data.subscriptionThreads.map(thread => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
          <a href="${APP_URL}/thread/${thread.id}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">
            ${escapeHtml(thread.title)}
          </a>
          <span style="color: #9ca3af; font-size: 13px; margin-left: 8px;">
            ${t.in} ${escapeHtml(thread.forumName)}
          </span>
        </td>
      </tr>
    `).join('')
    : `<tr><td style="padding: 16px; color: #9ca3af;">${t.noSubscriptions}</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${APP_NAME}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${t.subject}</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 24px 16px;">
              <h2 style="margin: 0; color: #111827; font-size: 20px;">
                ${t.greeting}, ${escapeHtml(data.username)}! 👋
              </h2>
              <p style="margin: 12px 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                ${t.intro}
              </p>
            </td>
          </tr>

          <!-- Your Activity -->
          <tr>
            <td style="padding: 16px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px;">${t.activityTitle}</h3>
              <table width="100%" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px; text-align: center; width: 25%;">
                    <div style="font-size: 24px; font-weight: 700; color: #3b82f6;">${data.activity.threadsCreated}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${t.threadsCreated}</div>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 25%;">
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">${data.activity.commentsPosted}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${t.commentsPosted}</div>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 25%;">
                    <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${data.activity.upvotesReceived}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${t.upvotesReceived}</div>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 25%;">
                    <div style="font-size: 24px; font-weight: 700; color: #8b5cf6;">${data.activity.repliesReceived}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${t.repliesReceived}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Trending -->
          <tr>
            <td style="padding: 16px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px;">${t.trendingTitle}</h3>
              <table width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${trendingHtml}
              </table>
            </td>
          </tr>

          <!-- Subscriptions -->
          ${data.subscriptionThreads.length > 0 ? `
          <tr>
            <td style="padding: 16px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px;">${t.subscriptionsTitle}</h3>
              <table width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${subscriptionsHtml}
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                ${t.viewMore} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                ${t.footer}
              </p>
              <p style="margin: 12px 0 0;">
                <a href="${data.unsubscribeUrl}" style="color: #6b7280; font-size: 13px; text-decoration: underline;">
                  ${t.unsubscribe}
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate plain text version of the digest
 */
function generateDigestText(data: DigestEmailData): string {
  const t = getTranslations(data.language);
  
  let text = `${t.greeting}, ${data.username}!\n\n${t.intro}\n\n`;
  
  // Activity
  text += `${t.activityTitle}\n`;
  text += `- ${t.threadsCreated}: ${data.activity.threadsCreated}\n`;
  text += `- ${t.commentsPosted}: ${data.activity.commentsPosted}\n`;
  text += `- ${t.upvotesReceived}: ${data.activity.upvotesReceived}\n`;
  text += `- ${t.repliesReceived}: ${data.activity.repliesReceived}\n\n`;
  
  // Trending
  text += `${t.trendingTitle}\n`;
  if (data.trendingThreads.length > 0) {
    data.trendingThreads.forEach(thread => {
      text += `- ${thread.title} (${thread.upvoteCount} ${t.votes})\n`;
      text += `  ${APP_URL}/thread/${thread.id}\n`;
    });
  } else {
    text += `${t.noTrending}\n`;
  }
  text += '\n';
  
  // Subscriptions
  if (data.subscriptionThreads.length > 0) {
    text += `${t.subscriptionsTitle}\n`;
    data.subscriptionThreads.forEach(thread => {
      text += `- ${thread.title}\n`;
      text += `  ${APP_URL}/thread/${thread.id}\n`;
    });
    text += '\n';
  }
  
  text += `---\n${t.footer}\n${t.unsubscribe}: ${data.unsubscribeUrl}`;
  
  return text;
}

/**
 * Send digest email to a user
 */
export async function sendDigestEmail(data: DigestEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const t = getTranslations(data.language);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: t.subject,
      html: generateDigestHtml(data),
      text: generateDigestText(data),
      tags: [
        { name: 'type', value: 'digest' },
        { name: 'frequency', value: 'weekly' },
      ],
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending digest email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export { getTranslations, translations };
