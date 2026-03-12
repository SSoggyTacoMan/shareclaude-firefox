export async function onRequest() {
    return Response.json({ message: "Opps! This route does not exist." }, { status: 404 });
}