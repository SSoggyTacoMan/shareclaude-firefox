export async function onRequest() {
    return Response.json({ message: "Oops! This route does not exist." }, { status: 404 });
}