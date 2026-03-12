export function getReadableError(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('no such table: chats')) {
        return 'Local D1 database is not initialized. Run "npm run db:migrate:local" in /app, then retry.';
    }

    return 'Something went wrong!';
}
