import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { chatsSchema } from '../../../database/schema';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

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
        return Response.json({ msg: "something went wrong!" }, { status: 500, headers: corsHeaders });
    }
}