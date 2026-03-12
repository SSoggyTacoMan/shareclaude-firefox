import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { chatsSchema } from '../../../../database/schema';

export async function onRequestGet(context) {
    const id = context.params.id;
    try {
        const db = drizzle(context.env.DB);
        const [chat] = await db.select().from(chatsSchema).where(eq(chatsSchema.id, id)).limit(1);
        if (!chat) {
            return new Response('Chat not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }

        const messages = Array.isArray(chat.content) ? chat.content : [];
        const lines = [`# ${chat.title}`, ''];

        for (const { source, message } of messages) {
            const role = source === 'user' ? 'You' : 'Claude';
            lines.push(`## ${role}`, '', message ?? '', '', '---', '');
        }

        return new Response(lines.join('\n'), {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.log('Error getting raw chat:', error);
        return new Response('Something went wrong', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
}
