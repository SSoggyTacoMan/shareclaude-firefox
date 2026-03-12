import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { chatsSchema } from '../../../database/schema';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function getReadableError(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('no such table: chats')) {
        return 'Local D1 database is not initialized. Run "npm run db:migrate:local" in /app, then retry.';
    }

    return 'something went wrong!';
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
    const id = context.params.id;
    try {
        const db = drizzle(context.env.DB);
        const [chat] = await db.select().from(chatsSchema).where(eq(chatsSchema.id, id)).limit(1)
        if (!chat) {
            return Response.json({ msg: 'chat not found' }, { status: 404, headers: corsHeaders });
        }

        return Response.json(chat, { headers: corsHeaders });
    } catch (error) {
        console.log("Error getting a chat: ", error)
        return Response.json({ msg: getReadableError(error) }, { status: 500, headers: corsHeaders });
    }
}